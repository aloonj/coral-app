import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export default function configurePassport() {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `https://dev.fragglerock.shop/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      
      // Check if user exists with this email
      let user = await User.findOne({ where: { email } });
      
      if (user) {
        // User exists - update with Google ID if not already set
        if (!user.googleId) {
          user.googleId = profile.id;
          user.authProvider = 'google';
          await user.save();
          console.log(`Linked Google account for user: ${email}`);
        }
        return done(null, user);
      } else {
        // No user with this email - reject login
        return done(null, false, { message: 'No account found with this email' });
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      return done(error);
    }
  }));
}
