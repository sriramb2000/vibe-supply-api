const functions = require('firebase-functions')

const authServer = require('./auth')
const vibeServer = require('./vibes')

// HTTP Cloud Function
const auth = functions.https.onRequest(authServer)
const vibe = functions.https.onRequest(vibeServer)

module.exports = {
    auth,
    vibe
}
