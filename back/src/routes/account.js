const express = require('express');
const router = express.Router();
const prisma = require('../config/prismaClient');
const bcrypt = require('bcrypt');

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

// Get User Data
router.get('/user-data', async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, email: true }
        });
        res.status(200).json(user);
    } catch (err) {
        res.status(400).json({ error: 'Error fetching user data' });
    }
});

module.exports = router;
