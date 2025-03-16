import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Define a global variable to track initialization state
let googleStrategyInitialized = false;

export default function configurePassport() {
  // Force a full refresh of the Google strategy every time
  if (passport._strategies.google) {
    console.log('Removing existing Google strategy for clean initialization');
    delete passport._strategies.google;
  }
  
  // Create a new strategy with absolute URLs
  const callbackURL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/api/auth/google/callback`
    : '/api/auth/google/callback';
    
  console.log('Configuring Google strategy with callback URL:', callbackURL);
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
    proxy: true,
    passReqToCallback: true,
    scope: ['profile', 'email']
  }, async (req, accessToken, refreshToken, profile, done) => {
    // Mark the strategy as initialized after first use
    if (!googleStrategyInitialized) {
      console.log('Google strategy initialized successfully');
      googleStrategyInitialized = true;
    }
    // Log useful debugging information
    console.log('Google auth callback triggered');
    console.log('Request URL:', req.originalUrl);
    console.log('Request headers:', req.headers);
    
    try {
      // Add additional timing safety
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('Google auth profile received:', {
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

  // Add a verification routine to check if initialization is complete
  const checkInitialization = () => {
    if (!googleStrategyInitialized) {
      console.log('Performing Google strategy warm-up...');
      
      // Force initialization by calling a method on the strategy
      try {
        if (passport._strategies.google) {
          const authUrlParams = {
            response_type: 'code',
            redirect_uri: callbackURL,
            scope: 'profile email'
          };
          
          // This will initialize the strategy without actually redirecting
          passport._strategies.google.authorizationParams(authUrlParams);
          console.log('Google strategy warm-up complete');
          googleStrategyInitialized = true;
        } else {
          console.warn('Google strategy not found during warm-up');
        }
      } catch (error) {
        console.error('Error during Google strategy warm-up:', error);
      }
    }
  };
  
  // Run a few warm-up checks
  setTimeout(checkInitialization, 100);
  setTimeout(checkInitialization, 1000);
  setTimeout(checkInitialization, 3000);
  
  return {
    isInitialized: () => googleStrategyInitialized
  };
}
