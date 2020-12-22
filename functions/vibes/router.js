const router = require('express').Router();
const controller = require('./controller');

router.post("/create/", controller.create);
router.get("/details/", controller.details);
router.put("/follow/", controller.follow)

/**
 *  vibes
- create vibe
	- create with corresponding playlist on spoitfy
- vibe details
	- owner/playlist it corresponds to
	- followers
	- track data
		- spotify URI, URL, img, artist
		- date added
 */

module.exports = router;