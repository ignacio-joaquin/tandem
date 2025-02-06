const express = require('express');
const router = express.Router();
const prisma = require('../config/prismaClient');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Mailjet = require('node-mailjet');
const { sendVerificationEmail } = require('../utils/mailsender');

const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile_pics/');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user.id}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Change Username
router.post('/change-username', async (req, res) => {
    const { username } = req.body;
    const userId = req.user.id;

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { username },
        });
        res.status(200).json({ message: 'Username updated successfully', user });
    } catch (err) {
        res.status(400).json({ error: 'Error updating username' });
    }
});

// Change Email
router.post('/change-email', async (req, res) => {
    const { email } = req.body;
    const userId = req.user.id;

    try {
        const token = crypto.randomBytes(32).toString('hex');
        const user = await prisma.user.update({
            where: { id: userId },
            data: { email, verificationToken: token, verificationEmailSentAt: new Date() },
        });

        await sendVerificationEmail(email, user.username, token);
        res.status(200).json({ message: 'Email updated and verification email sent', user });
    } catch (err) {
        res.status(400).json({ error: 'Error updating email' });
    }
});

// Request password change route
router.post('/request-password-change', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // Token valid for 1 hour

        await prisma.user.update({
            where: { email },
            data: { resetPasswordToken: token, resetPasswordTokenExpiry: tokenExpiry }
        });

        // Send password reset email
        const request = mailjet.post("send", { 'version': 'v3.1' }).request({
            "Messages": [{
                "From": {
                    "Email": "no-reply@tandemapp.xyz",
                    "Name": "Nacho, Fundador de Tandem"
                },
                "To": [{
                    "Email": email,
                    "Name": user.username
                }],
                "Subject": "Password Change Request",
                "TextPart": "Please change your password by clicking the link below.",
                "HTMLPart": `
                    <div style="background-color: #1a2332; color: #d4dbdc; padding: 20px; font-family: Arial, sans-serif;">
                        <h3 style="color: #00ff9c;">Dear ${user.username},</h3>
                        <p>Please change your password by clicking the link below:</p>
                        <a href="http://localhost:5000/change-password.html?token=${token}" style="color: #00ff9c;">Change Password</a>
                        <p>Thank you!</p>
                    </div>`
            }]
        });

        request.then((result) => {
            console.log('Mailjet response:', result.body);
        }).catch((err) => {
            console.error('Mailjet error:', err.statusCode, err.response.text);
        });

        res.status(200).json({ message: 'Password change email sent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error requesting password change' });
    }
});

// Change Password
router.post('/change-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordTokenExpiry: { gte: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, resetPasswordToken: null, resetPasswordTokenExpiry: null }
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating password' });
    }
});

// Upload Profile Picture
router.post('/upload-profile-pic', upload.single('profile_pic'), async (req, res) => {
    const userId = req.user.id;
    const profilePicPath = `/uploads/profile_pics/${req.file.filename}`;

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { profilePic: profilePicPath },
        });
        res.status(200).json({ message: 'Profile picture updated successfully', user });
    } catch (err) {
        res.status(400).json({ error: 'Error updating profile picture' });
    }
});

// Serve Profile Picture
router.get('/profile-pic/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId, 10);

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profilePic: true }
        });

        if (user && user.profilePic) {
            const filePath = path.join(__dirname, '..', '..', 'uploads', 'profile_pics', path.basename(user.profilePic));
            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            }
        }
        res.status(404).json({ error: 'Profile picture not found' });
    } catch (err) {
        res.status(400).json({ error: 'Error fetching profile picture' });
    }
});

// Get User Data
router.get('/user-data', async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, email: true, id: true, profilePic: true }
        });
        res.status(200).json(user);
    } catch (err) {
        res.status(400).json({ error: 'Error fetching user data' });
    }
});

// Resend Verification Email
router.post('/resend-verification-email', async (req, res) => {
    const { identifier } = req.body;
    let userId;

    if (identifier.includes('@')) {
        const user = await prisma.user.findUnique({ where: { email: identifier } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        userId = user.id;
    } else {
        const user = await prisma.user.findUnique({ where: { username: identifier } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        userId = user.id;
    }

    try {
        if (!user.isVerified) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const lastSent = user.verificationEmailSentAt;
            const now = new Date();
            if (lastSent && (now - lastSent) < 2 * 60 * 1000) {
                return res.status(429).json({ message: 'Please wait before requesting another verification email' });
            }

            const token = crypto.randomBytes(32).toString('hex');
            user.verificationEmailSentAt = now;

            await sendVerificationEmail(user.email, user.username, user.email);
            res.status(200).json({ message: 'Verification email sent.' });

        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error resending verification email' });
    }
});

module.exports = router;
