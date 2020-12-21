const router = require('express').Router();
const controller = require('./controller');

router.get("/redirect/", controller.redirect);
router.get("/token/", controller.token);

module.exports = router;