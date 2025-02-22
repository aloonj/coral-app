import express from 'express';
import { getClients, getClient, createClient, removeClient, regeneratePassword, updateClient } from '../controllers/clientController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createClientValidator, updateClientValidator, clientIdValidator } from '../middleware/validators/clientValidators.js';

const router = express.Router();

// Protect all client routes with authentication and admin role check
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPERADMIN'));

// Get all clients
router.get('/', getClients);

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

export default router;
