const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const goalsRoutes = require('./routes/goals');
const verifyRoutes = require('./routes/verification');
const cors = require('cors');
require('dotenv').config();
require('./config/passport')(passport);
const authMiddleware = require('./middlewares/authMiddleware');


const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: 'http://localhost:5500',
credentials:true
}));
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/goals', goalsRoutes);
app.use('/verify', verifyRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});