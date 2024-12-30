const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const prisma = require('./prismaClient');

// passport.js

module.exports = (passport) => {
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            // Try to find the user by email first
            let user = await prisma.user.findUnique({
                where: { email: email },
            });

            // If no user found by email, try to find by username
            if (!user) {
                user = await prisma.user.findUnique({
                    where: { username: email},
                });
            }

            // If no user found by either email or username
            if (!user) return done(null, false, { message: 'No user found' });

            // Compare the password with the hashed password in the database
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password' });

            console.log('Authenticated user:', user); // Log the authenticated user
            return done(null, user); // Authentication successful, pass the user to the next step
        } catch (err) {
            console.log(err)
            return done(err);
        }
    }));


    // Serialize user ID into the session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
        } catch (err) {
            done(err);
        }
    });


};

