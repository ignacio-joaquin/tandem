const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const cors = require('cors');
require('dotenv').config();
require('./config/passport')(passport);


const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
// Session
app.use(session({
    secret: 'your-secret-key', // Use an actual secret key in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,  // Change to true when using HTTPS
        maxAge: 3600000 // Set cookie expiration to 1 hour
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/', friendsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});