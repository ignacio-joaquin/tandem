const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');
const prisma = require('../config/prismaClient');

router.post('/', authMiddleware, async (req, res) => {
    const { title, type, friendUsername } = req.body;

    if (!title || !type || !friendUsername) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Look up the friend's ID by their username
        const friend = await prisma.user.findUnique({
            where: { username: friendUsername },
            select: { id: true },
        });

        if (!friend) {
            return res.status(404).json({ error: "Friend not found" });
        }

        // Check if the authenticated user and the friend are in an accepted friendship
        const userId = req.user.id; // Assuming the user ID is stored in the request after auth middleware

        const friendship = await prisma.friend.findFirst({
            where: {
                OR: [
                    {
                        senderId: userId,
                        receiverId: friend.id,
                        status: 'accepted',
                    },
                    {
                        senderId: friend.id,
                        receiverId: userId,
                        status: 'accepted',
                    },
                ],
            },
        });

        if (!friendship) {
            return res.status(400).json({ error: "You are not friends or friendship is not accepted" });
        }

        // Create the goal
        const newGoal = await prisma.goal.create({
            data: {
                userId: req.user.id, // Replace with the actual user ID
                title,
                type,
                friendId: friend.id, // Use the resolved friend's ID
                status: 'pending verification' // Set initial status
            },
        });

        res.status(201).json(newGoal);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to create goal" });
    }
});
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const goals = await prisma.goal.findMany({
            where: { userId },
            include: {
                friend: {
                    select: {
                        id: true,
                        username: true, // Adjusted field
                        email: true,
                    }
                }
            }
        });
        res.json(goals);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to fetch goals" });
    }
    
});

router.delete('/:goalId', authMiddleware, async (req, res) => {
    const { goalId } = req.params;
    const userId = req.user.id; // Assuming the user ID is stored in the request after auth middleware

    try {
        // Find the goal by its ID and ensure it belongs to the authenticated user
        const goal = await prisma.goal.findUnique({
            where: { id: parseInt(goalId) },
        });

        if (!goal) {
            return res.status(404).json({ error: "Goal not found" });
        }

        if (goal.userId !== userId) {
            return res.status(403).json({ error: "You are not authorized to delete this goal" });
        }

        // Delete the goal
        await prisma.goal.delete({
            where: { id: parseInt(goalId) },
        });

        res.status(200).json({ message: "Goal deleted successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to delete goal" });
    }
});

// GET: Retrieve all goals pending verification
router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const pendingGoals = await prisma.goal.findMany({
            where: { status: 'pending verification' },
            select: { id: true },
        });

        res.status(200).json(pendingGoals);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;