const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const prisma = require('./prismaClient');

// passport.js

module.exports = (passport) => {
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) return done(null, false, { message: 'No user found' });
    
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password' });
    
            console.log('Authenticated user:', user); // Log the authenticated user
            return done(null, user);
        } catch (err) {
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

