const router = require('express').Router();
const controller = require('./controller');

router.get("/vibes/", controller.vibes);
router.get("/following", controller.following);

/**
user
- user's vibes
- user's following vibes
 */

module.exports = router;