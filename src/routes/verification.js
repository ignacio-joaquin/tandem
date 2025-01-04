// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const fsPromises = fs.promises;
// const prisma = require('../config/prismaClient');
// const router = express.Router();
// const authMiddleware = require('../middlewares/authMiddleware');
// const {
//     encryptData,
//     decryptData,
//     saveEncryptedFile,
//     readEncryptedFile, // Ensure this line is present
// } = require('../utils/cryptoHelper');


// Directory for temporary file storage
// const UPLOAD_DIR = path.join(process.cwd(),'uploads');
// if (!fs.existsSync(UPLOAD_DIR)) {
//     fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// Multer setup for file storage
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//     filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
// });
// const upload = multer({ storage });

// POST: Send verification evidence
// router.post('/:id/', authMiddleware, upload.single('evidence'), async (req, res) => {
//     const { id } = req.params;
//     const { user } = req; // Assuming middleware for auth
//     const filePath = req.file ? path.join(UPLOAD_DIR, `${Date.now()}-encrypted.json`) : null;

//     if (!req.file) return res.status(400).json({ error: 'No evidence uploaded' });

//     try {
//         const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
//         if (!goal || goal.userId !== user.id) return res.status(404).json({ error: 'Goal not found' });

//         Encrypt the file and save
//         const encrypted = encryptData(fs.readFileSync(req.file.path));
//         saveEncryptedFile(filePath, encrypted);

//         Remove original unencrypted file
//         fs.unlinkSync(req.file.path);

//         Update goal to pending verification
//         await prisma.goal.update({
//             where: { id: parseInt(id) },
//             data: { verified: false, evidencePath: filePath },
//         });

//         res.status(200).json({ message: 'Verification evidence submitted' });
//     } catch (error) {
//         console.error(error);
//         if (filePath) fs.unlinkSync(filePath); // Cleanup on failure
//         res.status(500).json({ error: error.message });
//     }
// });


// GET: Retrieve verification evidence
// router.get('/evidence/:id', authMiddleware, async (req, res) => {
//     const { id } = req.params;

//     try {
//         const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
//         if (!goal || !goal.evidencePath || !fs.existsSync(goal.evidencePath)) {
//             return res.status(404).send('Evidence not found');
//         }

//         Read and decrypt the file
//         const encrypted = readEncryptedFile(goal.evidencePath);
//         const decrypted = decryptData(encrypted.iv, encrypted.data);

//         res.setHeader('Content-Type', 'image/png'); // Adjust MIME type if needed
//         res.status(200).send(decrypted); // Send decrypted data
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// });

// router.post('/respond-verification/:id/', authMiddleware, async (req, res) => {
//     const { id } = req.params;
//     const { decision } = req.body; // "verified" or "rejected"

//     try {
//         const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
//         if (!goal) return res.status(404).json({ error: 'Goal not found' });

//         Update goal status first
//         await prisma.goal.update({
//             where: { id: parseInt(id) },
//             data: { verified: decision === 'verified' },
//         });

//         Send the response immediately after updating
//         res.status(200).json({ message: `Goal ${decision}` });

//         Now handle file deletion asynchronously (after the response)
//         if (goal.evidencePath && fs.existsSync(goal.evidencePath)) {
//             fsPromises.unlink(goal.evidencePath)
//                 .then(() => {
//                     console.log(`File ${goal.evidencePath} deleted successfully.`);
//                 })
//                 .catch((err) => {
//                     console.error(`Error deleting file ${goal.evidencePath}:`, err);
//                 });
//         }
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ error: error.message });
//     }
// });


// module.exports = router;
