const functions = require('firebase-functions')
// Firebase Setup
const admin = require('firebase-admin');
// @ts-ignore
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Spotify OAuth 2 setup
// TODO: Configure the `spotify.client_id` and `spotify.client_secret` Google Cloud environment variables.
const SpotifyWebApi = require('spotify-web-api-node');
const Spotify = new SpotifyWebApi({
  clientId: functions.config().spotify.client_id,
  clientSecret: functions.config().spotify.client_secret,
  redirectUri: `https://${process.env.GCLOUD_PROJECT}.web.app/popup.html`,
});

module.exports = {
    admin,
    spotify: Spotify,
    db: admin.firestore(),
}
