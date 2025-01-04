const fs = require('fs');
const path = require('path');

// Directory for temporary file storage
const UPLOAD_DIR = path.join(__dirname, 'src', 'tmp', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Directory ${UPLOAD_DIR} created.`);
} else {
    console.log(`Directory ${UPLOAD_DIR} already exists.`);
}