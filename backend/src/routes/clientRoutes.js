import express from 'express';
import { 
  getClients, 
  getClient, 
  createClient, 
  removeClient, 
  regeneratePassword, 
  updateClient, 
  approveClient,
  getPendingApprovalsCount,
  getPendingRegistrationsCount,
  getClientProfile
} from '../controllers/clientController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createClientValidator, updateClientValidator, clientIdValidator } from '../middleware/validators/clientValidators.js';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// Client profile route - accessible by any authenticated user
router.get('/profile', getClientProfile);

// All other routes require admin role
router.use(authorize('ADMIN', 'SUPERADMIN'));

// Get all clients
router.get('/', getClients);

// Get count of pending approvals
router.get('/pending-approvals/count', getPendingApprovalsCount);

// Get count of recent registrations
router.get('/pending-registrations/count', getPendingRegistrationsCount);

// Get specific client
router.get('/:id', clientIdValidator, getClient);

// Create new client
router.post('/', createClientValidator, createClient);

// Update client
router.put('/:id', updateClientValidator, updateClient);

// Remove client
router.delete('/:id', clientIdValidator, removeClient);

// Regenerate client password
router.post('/:id/regenerate-password', clientIdValidator, regeneratePassword);

// Approve client (change status from INACTIVE to ACTIVE)
router.post('/:id/approve', clientIdValidator, approveClient);

export default router;
