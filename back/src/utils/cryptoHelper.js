const crypto = require('crypto');
const fs = require('fs');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 bytes)
const IV_LENGTH = 16; // Initialization vector length

// Encrypt function
function encryptData(data) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return { iv: iv.toString('hex'), data: encrypted.toString('hex') };
}

// Decrypt function
function decryptData(ivHex, encryptedHex) {
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
}

// Save encrypted file
function saveEncryptedFile(filePath, encrypted) {
    const payload = JSON.stringify(encrypted);
    fs.writeFileSync(filePath, payload, 'utf8');
}

// Read encrypted file
function readEncryptedFile(filePath) {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return payload;
}

module.exports = {
    encryptData,
    decryptData,
    saveEncryptedFile,
    readEncryptedFile, // Ensure this line is present
};
