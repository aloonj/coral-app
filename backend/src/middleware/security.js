import pkg from 'express-validator';
const { param: sanitizeParam, body: sanitizeBody } = pkg;
import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';

// General security middleware
export const securityMiddleware = [
  // Set security HTTP headers
  helmet(),
  
  // Data sanitization against XSS
  xss(),
  
  // Prevent parameter pollution
  hpp(),
  
  // Sanitize request parameters
  sanitizeParam('*').trim().escape(),
  
  // Sanitize request body
  sanitizeBody('*').trim().escape(),
  
  // Custom middleware to prevent SQL injection in query parameters
  (req, res, next) => {
    // List of SQL injection patterns
    const sqlInjectionPattern = /('|"|;|--|\/\*|\*\/|xp_|sp_|exec|execute|insert|select|delete|update|drop|union|into|load_file|outfile)/i;
    
    // Check query parameters
    const params = { ...req.query, ...req.params };
    for (const key in params) {
      if (sqlInjectionPattern.test(params[key])) {
        return res.status(403).json({
          message: 'Potential SQL injection detected'
        });
      }
    }
    
    next();
  },
  
  // Custom security headers
  (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    next();
  },
  
  // Validate Content-Type
  (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        if (req.is('multipart/form-data')) {
          // Allow multipart/form-data for file uploads
          next();
          return;
        }
        return res.status(415).json({
          message: 'Unsupported Media Type - API only accepts application/json or multipart/form-data'
        });
      }
    }
    next();
  }
];

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => e.message)
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'Duplicate entry',
      errors: err.errors.map(e => e.message)
    });
  }

  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'File too large'
    });
  }

  // Default error
  res.status(500).json({
    message: 'Internal server error'
  });
};
