const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/prismaClient');
const { sendPushNotification } = require('../utils/pushNotification'); // Add this line
const webpush = require('web-push');


router.post('/', authMiddleware, async (req, res) => {
    const { title, type, friendUsername } = req.body;

    if (!title || !type || !friendUsername) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Look up the friend's ID by their username
        const friend = await prisma.user.findUnique({
            where: { username: friendUsername },
            select: { id: true, pushSubscriptions: true }, // Add pushSubscriptions field
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

        // Send push notification to the friend
        if (friend.pushSubscriptions.length > 0) {
            await sendPushNotification(friend.id, 'New Goal Created', 'A new goal has been created for you to verify.');
        }

        res.status(201).json(newGoal);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to create goal" });
    }
});

router.post('/add', authMiddleware, async (req, res) => {
    const { title, type, friendUsername } = req.body;
    const userId = req.user.id;

    try {
        // Look up the friend's ID by their username
        const friend = await prisma.user.findUnique({
            where: { username: friendUsername },
            select: { id: true, pushSubscriptions: true } // Ensure pushSubscriptions is included
        });

        if (!friend) {
            return res.status(404).json({ error: 'Friend not found' });
        }

        // Create the goal
        const goal = await prisma.goal.create({
            data: {
                title,
                type,
                creatorId: userId,
                assigneeId: friend.id
            }
        });

        // Send push notification to the friend
        if (friend.pushSubscriptions.length > 0) {
            await sendPushNotification(friend.id, 'New Goal Assigned', `You have been assigned a new goal: ${title}`);
        }

        res.status(201).json(goal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add goal' });
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

router.post('/respond-verification/:id/', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { decision } = req.body; // "verified" or "rejected"

    try {
        const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        await prisma.goal.update({
            where: { id: parseInt(id) },
            data: { status: decision },
        });

        res.status(200).json({ message: `Goal ${decision}` });

        // Send push notification to the goal creator
        const goalCreator = await prisma.user.findUnique({ where: { id: goal.userId } });
        if (goalCreator.pushSubscriptions.length > 0) {
            await sendPushNotification(goal.userId, `Goal ${decision.charAt(0).toUpperCase() + decision.slice(1)}`, `Your goal has been ${decision} by your friend.`);
        }

        if (goal.evidencePath && fs.existsSync(goal.evidencePath)) {
            fsPromises.unlink(goal.evidencePath)
                .then(() => {
                    console.log(`File ${goal.evidencePath} deleted successfully.`);
                })
                .catch((err) => {
                    console.error(`Error deleting file ${goal.evidencePath}:`, err);
                });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

// New route for submitting a photo for verification
router.post('/verify/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { photo } = req.body;
    const userId = req.user.id;

    try {
        const goal = await prisma.goal.findUnique({
            where: { id: parseInt(id) },
            include: { friend: true }
        });

        if (!goal) {
            return res.status(404).json({ error: "Goal not found" });
        }

        const friendId = goal.friend.id;

        await prisma.goal.update({
            where: { id: parseInt(id) },
            data: { evidencePath: photo }
        });

        // Send push notification to the friend
        await sendPushNotification(friendId, 'New Photo for Verification', 'A new photo has been submitted for verification.');

        res.status(200).json({ message: "Photo submitted for verification" });
    } catch (error) {
        console.error("Error submitting photo for verification:", error);
        res.status(500).json({ error: "Failed to submit photo for verification" });
    }
});

module.exports = router;