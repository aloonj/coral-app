import { validationResult } from 'express-validator';
import XeroService from '../services/xeroService.js';
import { Order } from '../models/Order.js';
import Coral from '../models/Coral.js';
import Client from '../models/Client.js';
import { XeroToken } from '../models/XeroToken.js';

// Get Xero connection status
export const getXeroStatus = async (req, res) => {
  try {
    const status = await XeroService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting Xero status:', error);
    res.status(500).json({ message: 'Error getting Xero status' });
  }
};

// Start Xero OAuth flow
export const startXeroAuth = async (req, res) => {
  try {
    const { url, error } = XeroService.getAuthUrl();
    
    if (error) {
      return res.status(500).json({ message: error });
    }
    
    res.json({ url });
  } catch (error) {
    console.error('Error starting Xero auth:', error);
    res.status(500).json({ message: 'Error starting Xero authorization' });
  }
};

// Handle Xero OAuth callback
export const handleXeroCallback = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ message: 'Callback URL is required' });
    }
    
    const result = await XeroService.handleCallback(url);
    
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json({ message: 'Xero authentication successful', tenant: result.tenant });
  } catch (error) {
    console.error('Error handling Xero callback:', error);
    res.status(500).json({ message: 'Error handling Xero callback' });
  }
};

// Generate and optionally send a Xero invoice for an order
export const generateInvoice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { orderId } = req.params;
    const { sendToClient = false } = req.body;
    
    // Check if Xero is configured
    const status = await XeroService.getStatus();
    if (!status.connected) {
      return res.status(503).json({ 
        message: 'Xero integration not available', 
        status 
      });
    }
    
    // Get the order with all required data
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Client,
          as: 'client'
        },
        {
          model: Coral,
          as: 'items',
          through: { attributes: ['quantity', 'priceAtOrder', 'subtotal'] }
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Generate the invoice
    const result = await XeroService.generateInvoice(order);
    
    if (result.error) {
      return res.status(400).json({ 
        message: 'Failed to generate invoice', 
        error: result.error,
        details: result.details
      });
    }
    
    // If sendToClient is true, also send the invoice
    if (sendToClient) {
      const sendResult = await XeroService.sendInvoice(result.invoice.id);
      
      if (sendResult.error) {
        return res.status(400).json({
          message: 'Invoice generated but failed to send',
          invoice: result.invoice,
          error: sendResult.error,
          details: sendResult.details
        });
      }
      
      return res.json({
        message: 'Invoice generated and sent to client',
        invoice: result.invoice
      });
    }
    
    res.json({
      message: 'Invoice generated successfully',
      invoice: result.invoice
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      message: 'Error generating invoice',
      error: error.message
    });
  }
};

// Send an existing invoice
export const sendInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }
    
    // Check if Xero is configured
    const status = await XeroService.getStatus();
    if (!status.connected) {
      return res.status(503).json({ 
        message: 'Xero integration not available', 
        status 
      });
    }
    
    // Send the invoice
    const result = await XeroService.sendInvoice(invoiceId);
    
    if (result.error) {
      return res.status(400).json({ 
        message: 'Failed to send invoice', 
        error: result.error,
        details: result.details
      });
    }
    
    res.json({
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ 
      message: 'Error sending invoice',
      error: error.message
    });
  }
};

// Disconnect from Xero
export const disconnectXero = async (req, res) => {
  try {
    // Deactivate all Xero tokens
    await XeroToken.update(
      { active: false },
      { where: { active: true } }
    );
    
    // Reset the service
    await XeroService.disconnect();
    
    res.json({
      message: 'Successfully disconnected from Xero'
    });
  } catch (error) {
    console.error('Error disconnecting from Xero:', error);
    res.status(500).json({ 
      message: 'Error disconnecting from Xero',
      error: error.message
    });
  }
};
