const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');
const prisma = require('../config/prismaClient');
const { sendPushNotification } = require('../utils/pushNotification');
const webpush = require('web-push');

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
            if (existingRequest.status === "rejected") {
                // Delete the rejected friend request
                await prisma.friend.delete({ where: { id: existingRequest.id } });
            } else {
                return res.status(400).json({ message: "Friend request already exists or you're already friends" });
            }
        }

        // Create a new friend request
        const friendRequest = await prisma.friend.create({
            data: {
                senderId,
                receiverId,
                status: "pending",
            },
        });

        // Create notification for the receiver
        await prisma.notification.create({
            data: {
                userId: receiverId,
                message: `You have a new friend request from ${req.user.username}.`,
                type: 'friend_request',
                friendRequestId: friendRequest.id
            }
        });

        // Send push notification to the receiver
        if (receiver.pushToken) {
            sendPushNotification(receiver.pushToken, {
                title: 'New Friend Request',
                body: `You have a new friend request from ${req.user.username}.`,
                data: { friendRequestId: friendRequest.id }
            });
            console.log(`Push notification sent to ${receiver.username}`);
        }

        // Send web notification to the receiver
        await sendPushNotification(receiverId, 'Friend Request Received', 'You have received a new friend request.');

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
                where: { senderId, receiverId, status: "pending" },
                include: { sender: true, receiver: true } // Include sender and receiver details
            });

            if (!friendRequest) {
                return res.status(404).json({ message: "Friend request not found" });
            }

            const updatedRequest = await prisma.friend.update({
                where: { id: friendRequest.id },
                data: { status: action === "accept" ? "accepted" : "rejected" }
            });

            // Create notification for the sender
            await prisma.notification.create({
                data: {
                    userId: senderId,
                    message: `Your friend request has been ${action}ed by ${req.user.username}.`,
                    type: 'friend_request_response',
                    friendRequestId: friendRequest.id
                }
            });

            // Send push notification to the sender
            const sender = await prisma.user.findUnique({ where: { id: senderId } });
            if (sender.pushToken) {
                sendPushNotification(sender.pushToken, {
                    title: `Friend Request ${action.charAt(0).toUpperCase() + action.slice(1)}`,
                    body: `Your friend request has been ${action}ed by ${req.user.username}.`,
                    data: { friendRequestId: friendRequest.id }
                });
                console.log(`Push notification sent to ${sender.username}`);
            }

            // Send web notification to the sender
            await sendPushNotification(senderId, `Friend Request ${action.charAt(0).toUpperCase() + action.slice(1)}`, `Your friend request has been ${action}ed.`);

            // Create notification for the receiver if the request is accepted
            if (action === "accept") {
                await prisma.notification.create({
                    data: {
                        userId: receiverId,
                        message: `You are now friends with ${friendRequest.sender.username}.`,
                        type: 'friend_request_accepted',
                        friendRequestId: friendRequest.id
                    }
                });

                // Send push notification to the receiver
                if (req.user.pushToken) {
                    sendPushNotification(req.user.pushToken, {
                        title: 'Friend Request Accepted',
                        body: `You are now friends with ${friendRequest.sender.username}.`,
                        data: { friendRequestId: friendRequest.id }
                    });
                    console.log(`Push notification sent to ${req.user.username}`);
                }

                // Send web notification to the receiver
                await sendPushNotification(receiverId, 'Friend Request Accepted', `You are now friends with ${friendRequest.sender.username}.`);
            }

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
