const functions = require('firebase-functions')

const authServer = require('./auth')

// HTTP Cloud Function
const auth = functions.https.onRequest(authServer)

module.exports = {
    auth
}
