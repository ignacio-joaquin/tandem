const express = require('express');
const router = express.Router();
const prisma = require('../config/prismaClient');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
        const user = await prisma.user.update({
            where: { id: userId },
            data: { email },
        });
        res.status(200).json({ message: 'Email updated successfully', user });
    } catch (err) {
        res.status(400).json({ error: 'Error updating email' });
    }
});

// Change Password
router.post('/change-password', async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.status(200).json({ message: 'Password updated successfully', user });
    } catch (err) {
        res.status(400).json({ error: 'Error updating password' });
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

module.exports = router;
