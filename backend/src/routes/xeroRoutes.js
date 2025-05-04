import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getXeroStatus,
  startXeroAuth,
  handleXeroCallback,
  generateInvoice,
  sendInvoice
} from '../controllers/xeroController.js';

const router = express.Router();

// Xero connection status
router.get('/status',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  getXeroStatus
);

// Start OAuth flow
router.get('/auth',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  startXeroAuth
);

// Handle OAuth callback
router.post('/callback',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  handleXeroCallback
);

// Generate invoice for an order
router.post('/invoices/order/:orderId',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  generateInvoice
);

// Send an existing invoice
router.post('/invoices/:invoiceId/send',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  sendInvoice
);

export default router;