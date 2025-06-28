import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

const router = express.Router();

// Debug endpoint to test database connection
router.get('/debug/db-test', async (req, res) => {
  console.log('🔍 Testing database connection...');
  try {
    const testEmail = req.query.email || 'test@example.com';
    console.log(`Looking up user with email: ${testEmail}`);
    
    const startTime = Date.now();
    const user = await User.findOne({ where: { email: testEmail } });
    const queryTime = Date.now() - startTime;
    
    res.json({
      success: true,
      queryTime: `${queryTime}ms`,
      userFound: !!user,
      user: user ? { id: user.id, email: user.email, status: user.status } : null
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Test if passport strategy exists
router.get('/debug/passport-status', (req, res) => {
  const hasGoogleStrategy = !!passport._strategies.google;
  res.json({
    hasGoogleStrategy,
    strategies: Object.keys(passport._strategies || {})
  });
});

// Simplified callback handler without retries
router.get('/debug/google/callback', (req, res) => {
  console.log('🔍 DEBUG: Google callback received:', req.url);
  console.log('🔍 DEBUG: Query params:', req.query);
  console.log('🔍 DEBUG: Has Google strategy:', !!passport._strategies.google);
  
  const timeoutId = setTimeout(() => {
    console.error('🔍 DEBUG: Passport authenticate timed out after 10 seconds');
    res.status(504).json({ error: 'Authentication timeout' });
  }, 10000);
  
  passport.authenticate('google', { 
    session: false,
    failWithError: true
  })(req, res, (err) => {
    clearTimeout(timeoutId);
    console.log('🔍 DEBUG: Passport authenticate callback triggered');
    
    if (err) {
      console.error('🔍 DEBUG: Authentication error:', err);
      return res.status(401).json({
        error: 'Authentication failed',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
    
    if (!req.user) {
      console.error('🔍 DEBUG: No user found after authentication');
      return res.status(401).json({
        error: 'No user found'
      });
    }
    
    console.log('🔍 DEBUG: User authenticated:', req.user.email);
    
    try {
      const token = jwt.sign(
        { 
          id: req.user.id, 
          email: req.user.email, 
          role: req.user.role,
          name: req.user.name
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name
        },
        token
      });
    } catch (tokenError) {
      console.error('🔍 DEBUG: Token generation error:', tokenError);
      res.status(500).json({
        error: 'Token generation failed',
        details: tokenError.message
      });
    }
  });
});

export default router;