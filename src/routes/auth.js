const express = require('express');
const router = express.Router();
const passport = require('passport');
const prisma = require('../config/prismaClient');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Mailjet = require('node-mailjet'); // Correct the import statement

const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE); // Correct the connection method

// Registration route
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, username: username },
        });

        // Send verification email
        const request = mailjet.post("send", { 'version': 'v3.1' }).request({
            "Messages": [{
                "From": {
                    "Email": "chequeadoapp@gmail.com",
                    "Name": "Chequeado"
                },
                "To": [{
                    "Email": email,
                    "Name": username
                }],
                "Subject": "Email Verification",
                "TextPart": "Please verify your email by clicking the link below.",
                "HTMLPart": `
                    <div style="background-color: #1a2332; color: #d4dbdc; padding: 20px; font-family: Arial, sans-serif;">
                        <h3 style="color: #00ff9c;">Dear ${username},</h3>
                        <p>Please verify your email by clicking the link below:</p>
                        <a href="http://localhost:5000/api/auth/verify?email=${email}" style="color: #00ff9c;">Verify Email</a>
                        <p>Thank you!</p>
                    </div>`
            }]
        });

        request.then((result) => {
            console.log('Mailjet response:', result.body);
        }).catch((err) => {
            console.error('Mailjet error:', err.statusCode, err.response.text);
        });

        res.status(201).json({ message: 'User created. Verification email sent.', user });
    } catch (err) {
        res.status(400).json({ error: 'Error during registration' });
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
