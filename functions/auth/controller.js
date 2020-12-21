const functions = require('firebase-functions')
const crypto = require('crypto');

// Firebase Setup
const admin = require('firebase-admin');
// @ts-ignore
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
});

// Spotify OAuth 2 setup
// TODO: Configure the `spotify.client_id` and `spotify.client_secret` Google Cloud environment variables.
const SpotifyWebApi = require('spotify-web-api-node');
const Spotify = new SpotifyWebApi({
  clientId: functions.config().spotify.client_id,
  clientSecret: functions.config().spotify.client_secret,
  redirectUri: `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/popup.html`,
});

// Scopes to request.
const OAUTH_SCOPES = [
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative'
];

/**
 * Redirects the User to the Spotify authentication consent screen. Also the 'state' cookie is set for later state
 * verification.
 */
const redirect = (req, res) => {
    const state = req.cookies.state || crypto.randomBytes(20).toString('hex');
    console.log('Setting verification state:', state);
    res.cookie('state', state.toString(), {maxAge: 3600000, secure: true, httpOnly: true});
    const authorizeURL = Spotify.createAuthorizeURL(OAUTH_SCOPES, state.toString());
    res.redirect(authorizeURL);
}

/**
 * Exchanges a given Spotify auth code passed in the 'code' URL query parameter for a Firebase auth token.
 * The request also needs to specify a 'state' query parameter which will be checked against the 'state' cookie.
 * The Firebase custom auth token is sent back in a JSONP callback function with function name defined by the
 * 'callback' query parameter.
 */
const token = (req, res) => {
    try {
        // console.log('Received verification state:', req.cookies.state);
        console.log('Received state:', req.query.state);
        // if (!req.cookies.state) {
        //     throw new Error('State cookie not set or expired. Maybe you took too long to authorize. Please try again.');
        // } else if (req.cookies.state !== req.query.state) {
        //     throw new Error('State validation failed');
        // }
        if (!req.query.state) {
            throw new Error('State validation failed');
        }
        console.log('Received auth code:', req.query.code);
        Spotify.authorizationCodeGrant(req.query.code, (error, data) => {
            if (error) {
                throw error;
            }
            console.log('Received Access Token:', data.body['access_token']);
            Spotify.setAccessToken(data.body['access_token']);

            Spotify.getMe(async (error, userResults) => {
                if (error) {
                    throw error;
                }
                console.log('Auth code exchange result received:', userResults);
                // We have a Spotify access token and the user identity now.
                const accessToken = data.body['access_token'];
                const refreshToken = data.body['refresh_token'];
                const spotifyUserID = userResults.body['id'];
                const profilePic = userResults.body['images'][0]['url'];
                const userName = userResults.body['display_name'];
                const email = userResults.body['email'];

                // Create a Firebase account and get the Custom Auth Token.
                const firebaseToken = await createFirebaseAccount(spotifyUserID, userName, profilePic, email, accessToken, refreshToken);
                // Serve an HTML page that signs the user in and updates the user profile.
                res.jsonp({token: firebaseToken});
            });
        });
    } catch (error) {
        res.jsonp({error: error.toString()});
    }
    return null;
}

/**
 * Creates a Firebase account with the given user profile and returns a custom auth token allowing
 * signing-in this account.
 * Also saves the accessToken to the datastore at /spotifyAccessToken/$uid
 *
 * @returns {<string>} The Firebase custom auth token.
 */
async function createFirebaseAccount(spotifyID, displayName, photoURL, email, accessToken, refreshToken) {
    const uid = spotifyID;

    // Save the access token to the Firebase Realtime Database.
    const databaseTask = admin.firestore().doc(`users/${spotifyID}`).set({
        accessToken,
        refreshToken
    });
    // Create or update the user account.
    const userCreationTask = admin.auth().updateUser(uid, {
        displayName: displayName,
        photoURL: photoURL,
        email: email,
        emailVerified: true,
    }).catch((error) => {
        // If user does not exists we create it.
        if (error.code === 'auth/user-not-found') {
        return admin.auth().createUser({
            uid: uid,
            displayName: displayName,
            photoURL: photoURL,
            email: email,
            emailVerified: true,
        });
        }
        throw error;
    });

    // Wait for all async tasks to complete, then generate and return a custom auth token.
    await Promise.all([userCreationTask, databaseTask]);
    // Create a Firebase custom auth token.
    const token = await admin.auth().createCustomToken(uid);
    console.log('Created Custom token for UID "', uid, '" Token:', token);
    return token;
}

module.exports = {
    redirect,
    token
}
