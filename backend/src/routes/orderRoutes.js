import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  archiveOrder,
  markOrderAsPaid,
  markOrderAsUnpaid,
  purgeArchivedOrders
} from '../controllers/orderController.js';

const router = express.Router();

// Validation middleware
const orderItemValidation = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.coralId')
    .isInt()
    .withMessage('Invalid coral ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  body('clientId')
    .optional()
    .isInt()
    .withMessage('Invalid client ID'),
  body('preferredPickupDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid pickup date format')
    .custom((value) => {
      const pickupDate = new Date(value);
      const today = new Date();
      if (pickupDate < today) {
        throw new Error('Pickup date cannot be in the past');
      }
      return true;
    }),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const statusValidation = [
  body('status')
    .isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid order status')
];

// Client routes
router.post('/',
  authenticate,
  orderItemValidation,
  createOrder
);

router.get('/my-orders',
  authenticate,
  getOrders
);

router.get('/:id',
  authenticate,
  getOrderById
);

router.post('/:id/cancel',
  authenticate,
  cancelOrder
);

// Admin routes
router.get('/',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  getOrders
);

router.put('/:id/status',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  statusValidation,
  updateOrderStatus
);

router.put('/:id/paid',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  markOrderAsPaid
);

router.put('/:id/unpaid',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  markOrderAsUnpaid
);

router.put('/:id/archive',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  archiveOrder
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  deleteOrder
);

router.delete('/purge/archived',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  purgeArchivedOrders
);

export default router;
