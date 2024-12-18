const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');


// Pass the middleware as the second argument to the route handler
router.get('/',  async (req, res) => {

    if (req.isAuthenticated()) {
        res.json({ message: 'Protected route', user: req.user });
    } else {
        res.status(401).json({ message: 'MI PENE' });
    }
});
module.exports = router;
