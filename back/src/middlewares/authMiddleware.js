const prisma = require('../config/prismaClient');

module.exports = async (req, res, next) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }, // Assuming `req.user.id` comes from passport
            });
    
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
    
            req.user = user; // Replace `req.user` with the full user object
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    
};
