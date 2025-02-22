import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Invalid token or inactive user' });
    }

    // Include full user data in request
    req.user = {
      ...user.get({ plain: true }),
      // Keep token data that might be needed
      iat: decoded.iat,
      exp: decoded.exp
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};
