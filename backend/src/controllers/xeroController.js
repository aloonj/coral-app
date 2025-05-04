import { validationResult } from 'express-validator';
import XeroService from '../services/xeroService.js';
import { Order } from '../models/Order.js';
import Coral from '../models/Coral.js';
import Client from '../models/Client.js';

// Get Xero connection status
export const getXeroStatus = async (req, res) => {
  try {
    // Check if Xero service is available
    if (!XeroService.isConfigured()) {
      return res.json({
        connected: false,
        message: 'Xero integration not available',
        info: 'Xero integration is not configured'
      });
    }
    
    // Try to get actual status
    const status = await XeroService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting Xero status:', error);
    res.json({
      connected: false,
      message: 'Xero integration error',
      error: error.message
    });
  }
};

// Start Xero OAuth flow
export const startXeroAuth = async (req, res) => {
  try {
    // Check if Xero is configured first
    if (!XeroService.isConfigured()) {
      console.log('Starting auth flow with Xero service not fully configured');
    }
    
    const authUrlResult = XeroService.getAuthUrl();
    
    if (authUrlResult.error) {
      console.error('Error generating auth URL:', authUrlResult.error);
      return res.status(500).json({ 
        message: authUrlResult.error,
        error: 'Failed to start Xero authorization'
      });
    }
    
    if (!authUrlResult.url) {
      console.error('No URL generated');
      return res.status(500).json({ 
        message: 'No authorization URL generated',
        error: 'Failed to start Xero authorization'
      });
    }
    
    console.log('Generated Xero auth URL');
    res.json({ url: authUrlResult.url });
  } catch (error) {
    console.error('Error starting Xero auth:', error);
    res.status(500).json({ 
      message: 'Error starting Xero authorization',
      error: error.message
    });
  }
};

// Handle Xero OAuth callback
export const handleXeroCallback = async (req, res) => {
  try {
    // Determine if this is a direct callback from Xero (GET) or from our frontend (POST)
    const isDirectXeroCallback = req.method === 'GET';
    
    let callbackUrl;
    
    if (isDirectXeroCallback) {
      // Handle direct callback from Xero (this is the GET request from Xero redirect)
      console.log('Received direct Xero callback with params:', req.query);
      console.log('Request headers:', req.headers);
      console.log('Request path:', req.path);
      console.log('Request originalUrl:', req.originalUrl);
      
      // Log if we have the authorization code
      if (req.query.code) {
        console.log('Authorization code found in query params:', req.query.code);
      } else {
        console.log('No authorization code in query params!');
      }
      
      // For direct callbacks, construct the full URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers.host || 'dev.fragglerock.shop';
      const originalUrl = req.originalUrl;
      callbackUrl = `${protocol}://${host}${originalUrl}`;
      
      console.log('Constructed callback URL:', callbackUrl);
    } else {
      // Handle callback from frontend (the POST request with the URL in the body)
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'Callback URL is required in request body' });
      }
      
      callbackUrl = url;
      console.log('Received callback URL from frontend:', callbackUrl);
    }
    
    // Validate URL format
    try {
      new URL(callbackUrl);
    } catch (urlError) {
      console.error('Invalid URL format:', urlError);
      return res.status(400).json({ 
        message: 'Invalid URL format', 
        error: urlError.message 
      });
    }
    
    // Process the callback with Xero service
    const result = await XeroService.handleCallback(callbackUrl);
    
    if (result.error) {
      console.error('Error from Xero service:', result.error);
      
      if (isDirectXeroCallback) {
        // For direct Xero callbacks, redirect to the verification page with error params
        return res.redirect(`/xero-verification?error=${encodeURIComponent(result.error)}`);
      }
      
      return res.status(400).json({ 
        message: result.error,
        details: result.details || '',
        stack: result.stack || ''
      });
    }
    
    if (isDirectXeroCallback) {
      // For direct Xero callbacks, redirect to the verification page with success params
      return res.redirect('/xero-verification?success=true');
    }
    
    // For frontend callbacks, return JSON response
    res.json({ 
      message: 'Xero authentication successful', 
      tenant: result.tenant,
      success: true
    });
  } catch (error) {
    console.error('Error handling Xero callback:', error);
    
    // If it's a direct Xero callback, redirect to verification page with error
    if (req.method === 'GET') {
      return res.redirect(`/xero-verification?error=${encodeURIComponent('Failed to process callback')}`);
    }
    
    res.status(500).json({ 
      message: 'Error handling Xero callback',
      error: error.message,
      stack: error.stack
    });
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

// Generate a test invoice with sample data
export const generateTestInvoice = async (req, res) => {
  try {
    // Check if Xero is configured
    const status = await XeroService.getStatus();
    if (!status.connected) {
      return res.status(503).json({ 
        message: 'Xero integration not available', 
        status 
      });
    }
    
    // Create sample order data
    const sampleOrder = {
      id: 'TEST-' + Date.now(),
      client: {
        id: 'test-client',
        name: req.body.clientName || 'Test Client',
        email: req.body.clientEmail || 'test@example.com',
        phone: req.body.clientPhone || '555-123-4567'
      },
      items: [
        {
          speciesName: req.body.item1Name || 'Test Coral 1',
          scientificName: 'Test Scientific Name 1',
          OrderItem: {
            quantity: req.body.item1Quantity || 2,
            priceAtOrder: req.body.item1Price || 29.99,
            subtotal: (req.body.item1Quantity || 2) * (req.body.item1Price || 29.99)
          }
        }
      ]
    };
    
    // Add second item if requested
    if (req.body.includeSecondItem) {
      sampleOrder.items.push({
        speciesName: req.body.item2Name || 'Test Coral 2',
        scientificName: 'Test Scientific Name 2',
        OrderItem: {
          quantity: req.body.item2Quantity || 1,
          priceAtOrder: req.body.item2Price || 49.99,
          subtotal: (req.body.item2Quantity || 1) * (req.body.item2Price || 49.99)
        }
      });
    }
    
    // Generate the invoice using the sample order
    const result = await XeroService.generateInvoice(sampleOrder);
    
    if (result.error) {
      return res.status(400).json({ 
        message: 'Failed to generate test invoice', 
        error: result.error,
        details: result.details
      });
    }
    
    // If sendToClient is true, also send the invoice
    if (req.body.sendToClient) {
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
        message: 'Test invoice generated and sent',
        invoice: result.invoice,
        testData: sampleOrder
      });
    }
    
    res.json({
      message: 'Test invoice generated successfully',
      invoice: result.invoice,
      testData: sampleOrder
    });
  } catch (error) {
    console.error('Error generating test invoice:', error);
    res.status(500).json({ 
      message: 'Error generating test invoice',
      error: error.message
    });
  }
};