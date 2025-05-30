const express = require('express');
const router = express.Router();
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Mailjet = require('node-mailjet'); // Correct the import statement
const { sendVerificationEmail } = require('../utils/mailsender');

const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE); // Correct the connection method

// Registration route
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email: email, password: hashedPassword, username: username },
        });

        // Send verification email
        await sendVerificationEmail(email, username, email);

        res.status(201).json({ message: 'User created. Verification email sent.', user });
    } catch (err) {
        if (err.code === 'P2002') {
            res.status(400).json({ error: 'Email or username already in use' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Email verification route
router.get('/verify', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isVerified: true }
        });
        res.redirect('/login.html'); // Redirect to login page
    } catch (err) {
        res.status(400).json({ error: 'Error during email verification' });
    }
});

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Internal server error' });
        if (!user) return res.status(401).json({ message: info.message });

        // Check if the user's email is verified
        const isVerified = await prisma.user.findUnique({
            where: { id: user.id },
            select: { isVerified: true }
        });

        if (!isVerified.isVerified) {
            return res.status(401).json({ message: 'Email not verified. Please check your email for verification link.' });
        }

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
