const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const prisma = require('../config/prismaClient');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    encryptData,
    decryptData,
    saveEncryptedFile,
    readEncryptedFile, // Ensure this line is present
} = require('../utils/cryptoHelper');


const UPLOAD_DIR = path.join(process.cwd(),'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post('/:id/', authMiddleware, upload.single('evidence'), async (req, res) => {
    const { id } = req.params;
    const { user } = req; // Assuming middleware for auth
    const filePath = req.file ? path.join(UPLOAD_DIR, `${Date.now()}-encrypted.json`) : null;

    if (!req.file) return res.status(400).json({ error: 'No evidence uploaded' });

    try {
        const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
        if (!goal || goal.userId !== user.id) return res.status(404).json({ error: 'Goal not found' });

        const fileContent = fs.readFileSync(req.file.path); // Read file content
        const encrypted = encryptData(fileContent); // Encrypt file content
        saveEncryptedFile(filePath, encrypted); // Save encrypted content

        fs.unlinkSync(req.file.path); // Delete original file

        await prisma.goal.update({
            where: { id: parseInt(id) },
            data: { status: 'pending verification', evidencePath: filePath },
        });

        res.status(200).json({ message: 'Verification evidence submitted' });
    } catch (error) {
        console.error(error);
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); // Cleanup on failure
        res.status(500).json({ error: error.message });
    }
});


router.get('/evidence/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
        if (!goal || !goal.evidencePath || !fs.existsSync(goal.evidencePath)) {
            return res.status(404).send('Evidence not found');
        }

        const encrypted = readEncryptedFile(goal.evidencePath);
        const decrypted = decryptData(encrypted.iv, encrypted.data);

        res.setHeader('Content-Type', 'image/png'); // Adjust MIME type if needed
        res.status(200).send(decrypted); // Send decrypted data
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
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

router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const goals = await prisma.goal.findMany({
            where: {
                status: 'pending verification'
            }
        });
        res.status(200).json(goals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
