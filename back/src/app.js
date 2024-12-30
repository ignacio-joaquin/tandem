const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const goalsRoutes = require('./routes/goals');
const verifyRoutes = require('./routes/verification');
const setupCronJobs = require('./cronjobs/goals');
const cors = require('cors');
const accountRoutes = require('./routes/account');
require('dotenv').config();
require('./config/passport')(passport);
const authMiddleware = require('./middlewares/authMiddleware');


const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ['http://192.168.0.22:5000', 'http://192.168.0.10:5000'],
    credentials: true
}));

// Serve static files from the front directory

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

app.use('/protected', authMiddleware, express.static(path.join(__dirname, '../../front/protected')));
app.use(express.static(path.join(__dirname, '../../front/')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/goals', goalsRoutes);
app.use('/verify', verifyRoutes);
app.use('/account', accountRoutes);

// Setup cron jobs
setupCronJobs();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});