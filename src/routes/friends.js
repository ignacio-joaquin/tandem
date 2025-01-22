const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');
const prisma = require('../config/prismaClient');

    router.get('/', authMiddleware, async (req, res) => {
        const userId = req.user.id;

        try {
            const friends = await prisma.friend.findMany({
                where: {
                    OR: [
                        { senderId: userId, status: "accepted" },
                        { receiverId: userId, status: "accepted" }
                    ]
                },
                include: {
                    sender: true,
                    receiver: true
                }
            });

            const friendList = friends.map(friend => {
                const friendData = friend.senderId === userId ? friend.receiver : friend.sender;
                return {
                    id: friendData.id,
                    username: friendData.username
                };
            });

            res.json({ friends: friendList });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

router.post('/add', authMiddleware, async (req, res) => {
    console.log(req.body);
    const receiverUsername = req.body.receiverUsername; // Expecting receiver's username
    const senderId = req.user.id; // Sender's ID from authentication middleware

    if (!receiverUsername) {
        return res.status(400).json({ message: "Receiver username is required" });
    }

    try {
        // Find the receiver's user ID by their username
        const receiver = await prisma.user.findUnique({
            where: { username: receiverUsername },
        });

        if (!receiver) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        const receiverId = receiver.id;

        if (senderId === receiverId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        // Check if a friend request already exists
        const existingRequest = await prisma.friend.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId },
                ],
            },
        });

        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already exists or you're already friends" });
        }

        // Create a new friend request
        const friendRequest = await prisma.friend.create({
            data: {
                senderId,
                receiverId,
                status: "pending",
            },
        });

        res.status(201).json({ message: "Friend request sent", friendRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch('/respond', async (req, res) => {
    if (req.isAuthenticated()) {
        const { senderId, action } = req.body;
        const receiverId = req.user.id;

        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({ message: "Invalid action" });
        }

        try {
            console.log(senderId, receiverId);
            const friendRequest = await prisma.friend.findFirst({
                where: { senderId, receiverId, status: "pending" }
            });

            if (!friendRequest) {
                return res.status(404).json({ message: "Friend request not found" });
            }

            const updatedRequest = await prisma.friend.update({
                where: { id: friendRequest.id },
                data: { status: action === "accept" ? "accepted" : "rejected" }
            });

            res.json({ message: `Friend request ${action}ed`, updatedRequest });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(401).json({ message: "Unauthorized" });
    }
});

router.delete('/remove', async (req, res) => {
    if (req.isAuthenticated()) {
        const { friendId } = req.body;
        const userId = req.user.id;

        try {
            const friendship = await prisma.friend.findFirst({
                where: {
                    OR: [
                        { senderId: userId, receiverId: friendId, status: "accepted" },
                        { senderId: friendId, receiverId: userId, status: "accepted" }
                    ]
                }
            });

            if (!friendship) {
                return res.status(404).json({ message: "Friendship not found" });
            }

            // Remove all goals associated with this friendship
            await prisma.goal.deleteMany({
                where: {
                    OR: [
                        { userId: userId, friendId },
                        { userId: friendId, friendId: userId }
                    ]
                }
            });

            await prisma.friend.delete({ where: { id: friendship.id } });
            res.json({ message: "Friend and associated goals removed" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(401).json({ message: "Unauthorized" });
    }
});

router.get('/incoming', authMiddleware, async (req, res) => {
    const userId = req.user.id; // The current authenticated user's ID

    try {
        const incomingRequests = await prisma.friend.findMany({
            where: {
                receiverId: userId,
                status: "pending", // Only fetch pending requests
            },
            include: {
                sender: true, // Include sender details
            },
        });

        const requests = incomingRequests.map(request => ({
            id: request.senderId,
            senderId: request.senderId,
            senderUsername: request.sender.username, // Use username for frontend display
            createdAt: request.createdAt,
        }));

        res.json({ requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
