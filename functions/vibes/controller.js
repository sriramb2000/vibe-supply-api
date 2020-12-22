const Firestore = require('@google-cloud/firestore')
const { admin, spotify, db } = require('../common')


const ACCESS_TOKEN = "BQD1AvID7j_iskmKidLkmjdPJmr7l3LW69VjynQ1GcHxGfhKTW1PW4V20RsgDKDJapg2u6No13dsxdyWJQH9rlALJ8QGwjTMUm-yMzLG2323WTF06uwhUzhUqbd1SVnwqnBpLTtzqB9i0u_n5KY4MU4CSvBoSkAAAXLA8qd8S4w5r7yC6cMOYjmvUbdq8NFe_lnCH_Iu20WFoj-mVJbdjkczw9w3bd-k5md94DL6m1VR5Xtb_X0"
const REFRESH_TOKEN = "AQBDxj2_ZxM1DiVtJkoNUD4FcwsIngCFC7gdWUdH4Uf9whdsqE01MFRpq0whToSCG2VZJy_xBAhMaC66VMdt5S7O19h3ALWzNx_1poUFmjEAEMOt8Jznu6Mp5rxpFMmampg"
const UID = "22svycycn5pdjvrg4qn4ojczy"

const create = async (req, res) => {
    const accessToken = (req.spotifyAuth && req.spotifyAuth.accessToken) || ACCESS_TOKEN;
    const refreshToken = (req.spotifyAuth && req.spotifyAuth.refreshToken) || REFRESH_TOKEN;
    const vibeName = req.body.name || 'testingPlaylist69420 🤠';
    const uid = req.authId || UID;

    await createVibe(vibeName, uid, accessToken, refreshToken)

    res.status(200).send()
}

const details = (req, res) => {

}

const follow = async (req, res) => {
    const uid = req.authId || req.body.uid;
    const vibeId = req.body.vibeId;

    const userRef = db.collection('users').doc(`${uid}`)
    const userSnapshot = await userRef.get()
    if (!uid || !userSnapshot.exists) {
        return res.status(400).json({success: false, error: "Invalid uid"})
    }
    const vibeRef = db.collection('vibes').doc(`${vibeId}`)
    const vibeSnapshot = await vibeRef.get()
    if (!vibeId || !vibeSnapshot.exists) {
        return res.status(400).json({success: false, error: "Invalid vibeId"})
    }

    const userData = await admin.auth().getUser(uid)

    const userTask = userRef.collection('following').doc(vibeId).set({})
    const vibeTask = vibeRef.collection('followers').doc(uid).set({
        user: {
            uid: userData.uid,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
        },
        createdAtTimestamp: Firestore.FieldValue.serverTimestamp()
    })

    await Promise.all([userTask, vibeTask])

    res.status(200).send()
}


const createVibe = async (vibeName, uid, accessToken, refreshToken) => {
    spotify.setAccessToken(accessToken)
    spotify.setRefreshToken(refreshToken)
    return spotify.refreshAccessToken().then((data) => {
        spotify.setAccessToken(data.body.access_token)
        spotify.createPlaylist(`${vibeName}`, { 'description': 'test description', 'public': false })
        .then(async (data) => {
            const vibeId = data.body.id
            console.log(`Created playlist ${vibeId}`);
            const userVibeRef = db.doc(`users/${uid}/vibes/${vibeId}`)
            const newVibeRef = db.doc(`vibes/${vibeId}`)
            const newVibeItemRef = newVibeRef.collection('items').doc('placeholder')
            const newVibeFollowersRef = newVibeRef.collection('followers').doc('placeholder')

            const newUserVibeTask = userVibeRef.set({playlist: data.body, user: uid})
            const newVibeTask = newVibeRef.set({playlist: data.body, user: uid})
            const newItemCollectionTask = newVibeItemRef.set({})
            const newFollowersCollectionTask = newVibeFollowersRef.set({})

            await Promise.all([newUserVibeTask, newVibeTask])
            await Promise.all([newItemCollectionTask, newFollowersCollectionTask])

        }, function(err) {
            console.log('Something went wrong!', err);
        });
    })
}

module.exports = {
    create,
    details,
    follow
}
