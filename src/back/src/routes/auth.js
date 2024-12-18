const express = require('express');
const router = express.Router();
const passport = require('passport');
const prisma = require('../config/prismaClient');
const bcrypt = require('bcrypt');

// Registration route
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, username: username},
        });
        res.status(201).json({ message: 'User created', user });
    } catch (err) {
        res.status(400).json({ error: 'Error during registration'});
    }
});

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Internal server error' });
        if (!user) return res.status(401).json({ message: info.message });

        req.logIn(user, (err) => {
            if (err) return res.status(500).json({ message: 'Login failed' });
            return res.status(200).json({ message: 'Logged in successfully', user: req.user });
        });
    })(req, res, next);
});


// Logout route
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.json({ message: 'Logged out' });
    });
});

module.exports = router;
