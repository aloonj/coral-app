import { validationResult } from 'express-validator';
import XeroService from '../services/xeroService.js';
import { Order } from '../models/Order.js';
import Coral from '../models/Coral.js';
import Client from '../models/Client.js';
import { XeroToken } from '../models/XeroToken.js';

// Get Xero connection status
export const getXeroStatus = async (req, res) => {
  try {
    // Make sure Xero service is initialized before checking status
    await XeroService.ensureInitialized();
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
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();
    
    // Check if we should force a new authentication flow
    const forceNew = req.query.forceNew === 'true';
    console.log('Starting Xero auth with forceNew:', forceNew);
    
    // Properly await the async getAuthUrl method
    const { url, error } = await XeroService.getAuthUrl(forceNew);
    
    if (error) {
      return res.status(500).json({ message: error });
    }
    
    console.log('Sending Xero auth URL to frontend:', url);
    res.json({ url });
  } catch (error) {
    console.error('Error starting Xero auth:', error);
    res.status(500).json({ message: 'Error starting Xero authorization' });
  }
};

// Handle Xero OAuth callback
export const handleXeroCallback = async (req, res) => {
  try {
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();
    
    console.log('Xero callback controller called with body:', req.body);
    console.log('Xero callback controller called with query:', req.query);
    
    let url;
    
    // Case 1: URL is in body (from manual submission)
    if (req.body && req.body.url) {
      url = req.body.url;
    } 
    // Case 2: URL is in query (from redirect)
    else if (req.query && req.query.url) {
      url = req.query.url;
    }
    // Case 3: Xero redirected with code and other params directly in the query
    else if (req.query && req.query.code) {
      // Construct the full URL from the original request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const originalUrl = req.originalUrl;
      
      url = `${protocol}://${host}${originalUrl}`;
      console.log('Constructed callback URL from request:', url);
    } else {
      console.error('No callback parameters provided in request');
      return res.status(400).json({ message: 'Callback URL or code is required' });
    }
    
    console.log('Processing Xero callback with URL:', url);
    const result = await XeroService.handleCallback(url);
    
    if (result.error) {
      console.error('Error from Xero service:', result.error, result.details || '');
      
      // Check if this is a browser redirect (GET request) or API call (POST request)
      if (req.method === 'GET') {
        // For browser redirects, redirect to the verification page with error
        const frontendUrl = process.env.FRONTEND_URL || 'https://dev.fragglerock.shop';
        const errorMessage = encodeURIComponent(result.error);
        const redirectUrl = `${frontendUrl}/xero-verification?error=${errorMessage}`;
        console.log('Redirecting to frontend error page:', redirectUrl);
        return res.redirect(redirectUrl);
      } else {
        // For API calls, return JSON error
        return res.status(400).json({ 
          message: result.error,
          details: result.details
        });
      }
    }
    
    console.log('Xero authentication successful, tenant:', result.tenant);
    
    // Check if this is a browser redirect (GET request) or API call (POST request)
    if (req.method === 'GET') {
      // For browser redirects, redirect to the admin page
      const frontendUrl = process.env.FRONTEND_URL || 'https://dev.fragglerock.shop';
      const redirectUrl = `${frontendUrl}/xero-admin?success=true`;
      console.log('Redirecting to frontend:', redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      // For API calls (like manual callback URL submission), return JSON
      res.json({ message: 'Xero authentication successful', tenant: result.tenant });
    }
  } catch (error) {
    console.error('Error handling Xero callback:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      message: 'Error handling Xero callback',
      error: error.message
    });
  }
};

// Generate and optionally send a Xero invoice for an order
export const generateInvoice = async (req, res) => {
  try {
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();
    
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
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();
    
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

// Generate a test invoice with provided data
export const generateTestInvoice = async (req, res) => {
  try {
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if Xero is configured
    const status = await XeroService.getStatus();
    if (!status.connected) {
      return res.status(503).json({
        message: 'Xero integration not available',
        status
      });
    }

    const testData = req.body;

    if (!testData) {
      return res.status(400).json({ message: 'Test invoice data is required' });
    }

    // Create a test invoice in Xero
    const result = await XeroService.generateTestInvoice(testData);

    if (result.error) {
      return res.status(400).json({
        message: 'Failed to generate test invoice',
        error: result.error,
        details: result.details
      });
    }

    // If sendToClient is true, also send the invoice
    if (testData.sendToClient && result.invoice && result.invoice.id) {
      const sendResult = await XeroService.sendInvoice(result.invoice.id);

      if (sendResult.error) {
        return res.status(400).json({
          message: 'Test invoice generated but failed to send',
          invoice: result.invoice,
          error: sendResult.error,
          details: sendResult.details
        });
      }

      return res.json({
        message: 'Test invoice generated and sent to client',
        invoice: result.invoice
      });
    }

    res.json({
      message: 'Test invoice generated successfully',
      invoice: result.invoice
    });
  } catch (error) {
    console.error('Error generating test invoice:', error);
    res.status(500).json({
      message: 'Error generating test invoice',
      error: error.message
    });
  }
};

// Disconnect from Xero
// Get all invoices for the current tenant
export const getInvoices = async (req, res) => {
  try {
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();
    
    // Check if Xero is configured
    const status = await XeroService.getStatus();
    if (!status.connected) {
      return res.status(503).json({ 
        message: 'Xero integration not available', 
        status 
      });
    }
    
    // Fetch invoices from Xero
    const result = await XeroService.getInvoices();
    
    if (result.error) {
      return res.status(400).json({ 
        message: 'Failed to fetch invoices', 
        error: result.error,
        details: result.details
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

export const disconnectXero = async (req, res) => {
  try {
    // Make sure Xero service is initialized
    await XeroService.ensureInitialized();
    
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
