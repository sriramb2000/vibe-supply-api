const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();

app
    .use(bodyParser.urlencoded({extended: false}))
    .use(bodyParser.json())
    .use(cookieParser())
    .use("/", require('./router'))
    .get('*', (_, res) => res.status(404).json({success: false, data: 'endpoint not found.'}));

module.exports = app;
