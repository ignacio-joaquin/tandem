const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');


router.post('/add', async (req, res) => {
    const { receiverId } = req.body;
    const senderId = req.user.id; // Assuming req.user contains the logged-in user

    if (senderId === receiverId) {
        return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    try {
        const existingRequest = await prisma.friend.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        });

        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already exists or you're already friends" });
        }

        const friendRequest = await prisma.friend.create({
            data: {
                senderId,
                receiverId,
                status: "pending"
            }
        });

        res.status(201).json({ message: "Friend request sent", friendRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});


router.patch('/respond', async (req, res) => {
    const { senderId, action } = req.body; // action = "accept" or "reject"
    const receiverId = req.user.id; // Assuming req.user contains the logged-in user

    if (!["accept", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
    }

    try {
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
});

router.get('/',async (req, res) => {
    const userId = req.user.id; // Assuming req.user contains the logged-in user

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
            return friend.senderId === userId
                ? friend.receiver // The other user is the friend
                : friend.sender;
        });

        res.json({ friends: friendList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete('/remove', async (req, res) => {
    const { friendId } = req.body; // The ID of the friend user to remove
    const userId = req.user.id; // Assuming req.user contains the logged-in user

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

        await prisma.friend.delete({ where: { id: friendship.id } });
        res.json({ message: "Friend removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
