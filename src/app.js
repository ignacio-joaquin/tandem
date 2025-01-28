const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const goalsRoutes = require('./routes/goals');
const verifyRoutes = require('./routes/verification');
const notificationsRoutes = require('./routes/notifications'); // Ensure this line is present
const setupCronJobs = require('./cronjobs/goals');
const setupNotificationCronJob = require('./cronjobs/notifications'); // Correctly import the function
const cors = require('cors');
const bodyParser = require('body-parser');
const accountRoutes = require('./routes/account');
require('dotenv').config();
require('./config/passport')(passport);
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();

app.use(bodyParser.json({ limit: '500mb' })); // Add this line
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true })); // Add this line

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ['http://192.168.0.22:5000', 'http://192.168.0.10:5000'],
    credentials: true
}));

// Increase payload size limit

// Serve static files from the public directory

// Session
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set `true` for HTTPS
        httpOnly: true,
        sameSite: 'Lax' // Can also use 'none' for cross-origin with `secure: true`
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use('/protected', authMiddleware, express.static(path.join(__dirname, '../public/protected')));
app.use(express.static(path.join(__dirname, '../public/')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/goals', goalsRoutes);
app.use('/verify', verifyRoutes);
app.use('/notifications', notificationsRoutes); // Ensure this line is present
app.use('/account', accountRoutes);

// Serve service worker
app.get('/service-worker.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public/service-worker.js'));
});

// Serve manifest
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public/manifest.json'));
});

// Setup cron jobs
setupCronJobs();
setupNotificationCronJob(); // Add this line

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});