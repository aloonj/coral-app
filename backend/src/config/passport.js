import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export default function configurePassport() {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'https://dev.fragglerock.shop'}/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google auth callback triggered for profile:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails ? profile.emails.map(e => e.value) : 'No emails'
      });
      
      if (!profile.emails || profile.emails.length === 0) {
        console.error('No email found in Google profile');
        return done(new Error('No email found in Google profile'));
      }
      
      const email = profile.emails[0].value;
      console.log(`Looking up user with email: ${email}`);
      
      // Check if user exists with this email
      let user = await User.findOne({ where: { email } });
      
      if (user) {
        console.log(`User found: ${user.id}, status: ${user.status}, role: ${user.role}`);
        
        // User exists - update with Google ID if not already set
        if (!user.googleId) {
          console.log(`Updating user with Google ID: ${profile.id}`);
          user.googleId = profile.id;
          user.authProvider = 'google';
          await user.save();
          console.log(`Linked Google account for user: ${email}`);
        }
        
        // Check if user is active
        if (user.status !== 'ACTIVE') {
          console.log(`User ${user.id} is not active (status: ${user.status})`);
          return done(new Error('Your account is pending approval'));
        }
        
        console.log(`Authentication successful for user: ${user.id}`);
        return done(null, user);
      } else {
        console.log(`No user found with email: ${email}`);
        // No user with this email - reject login
        return done(new Error('No account found with this email'));
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      return done(error);
    }
  }));
}
