import { TokenSet } from 'openid-client';
import { XeroClient } from 'xero-node';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Xero client
const initXero = () => {
  try {
    // Check for required environment variables
    const requiredEnvVars = [
      'XERO_CLIENT_ID',
      'XERO_CLIENT_SECRET',
      'XERO_REDIRECT_URI'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.warn(`Missing Xero environment variables: ${missingVars.join(', ')}`);
      console.warn('Xero integration will not be available.');
      return null;
    }

    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_REDIRECT_URI],
      scopes: 'openid profile email accounting.transactions accounting.contacts offline_access',
    });

    return xero;
  } catch (error) {
    console.error('Error initializing Xero client:', error);
    return null;
  }
};

// Global Xero client instance
const xeroClient = initXero();

// Service for managing Xero integration
class XeroService {
  constructor() {
    this.client = xeroClient;
    this.tokenSet = null;
    this.tenantId = process.env.XERO_TENANT_ID;
    this.tokenSetKey = 'xero_token_set';
  }

  isConfigured() {
    return !!(this.client && this.tenantId);
  }

  // Generate authorization URL for OAuth flow
  getAuthUrl() {
    if (!this.client) return { error: 'Xero not configured' };
    
    try {
      const consentUrl = this.client.buildConsentUrl();
      return { url: consentUrl };
    } catch (error) {
      console.error('Error generating Xero auth URL:', error);
      return { error: 'Failed to generate authorization URL' };
    }
  }

  // Complete OAuth flow with callback code
  async handleCallback(callbackUrl) {
    if (!this.client) return { error: 'Xero not configured' };
    
    try {
      // Exchange authorization code for tokens
      this.tokenSet = await this.client.apiCallback(callbackUrl);
      
      // Store the token set
      await this.saveTokenSet(this.tokenSet);
      
      // If tenant ID is not set, get connected tenants
      if (!this.tenantId) {
        const tenants = await this.client.updateTenants(this.tokenSet.access_token);
        if (tenants.length > 0) {
          this.tenantId = tenants[0].tenantId;
          console.log('Using Xero tenant ID:', this.tenantId);
        } else {
          return { error: 'No Xero organizations connected' };
        }
      }
      
      return { success: true, tenant: this.tenantId };
    } catch (error) {
      console.error('Error handling Xero callback:', error);
      return { error: 'Failed to authenticate with Xero' };
    }
  }

  // Save token set to database or other storage
  async saveTokenSet(tokenSet) {
    // In production, you would store this securely in a database
    // For now, we just store it in memory
    this.tokenSet = tokenSet;
    console.log('Xero TokenSet saved');
  }

  // Load token set from storage
  async loadTokenSet() {
    // In production, you would retrieve from a database
    // For now, we just use the memory-stored one
    return this.tokenSet;
  }

  // Ensure we have a valid token before making API calls
  async ensureToken() {
    if (!this.client) return { error: 'Xero not configured' };
    
    try {
      // Load token set if not in memory
      if (!this.tokenSet) {
        this.tokenSet = await this.loadTokenSet();
        
        // If still no token, auth is required
        if (!this.tokenSet) {
          return { error: 'Authentication required', authUrl: this.getAuthUrl() };
        }
      }
      
      // Check if token refresh is needed
      if (this.client.readTokenSet(this.tokenSet).expired()) {
        console.log('Refreshing Xero token');
        this.tokenSet = await this.client.refreshToken();
        await this.saveTokenSet(this.tokenSet);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error ensuring Xero token:', error);
      return { error: 'Token validation failed' };
    }
  }

  // Generate Xero invoice from order
  async generateInvoice(order) {
    if (!this.client) return { error: 'Xero not configured' };
    if (!this.tenantId) return { error: 'Xero tenant ID not configured' };
    
    // Ensure we have a valid token
    const tokenStatus = await this.ensureToken();
    if (tokenStatus.error) {
      return tokenStatus;
    }
    
    try {
      // Prepare client contact
      let contact;
      
      // If order is archived, use archived client data
      const clientData = order.archived ? order.archivedClientData : order.client;
      
      if (!clientData) {
        return { error: 'Client information not available' };
      }
      
      // Try to find contact by name or email
      const contactName = clientData.name || 'Unknown Client';
      const contactEmail = clientData.email;
      
      // Find if contact already exists
      const contactResponse = await this.client.accountingApi.getContacts(
        this.tokenSet.access_token,
        this.tenantId,
        undefined,
        `Name=="${contactName}" OR EmailAddress=="${contactEmail}"`
      );
      
      // Use existing contact or create new one
      if (contactResponse.body.contacts && contactResponse.body.contacts.length > 0) {
        contact = contactResponse.body.contacts[0];
      } else {
        // Create new contact
        const newContact = {
          name: contactName,
          firstName: contactName.split(' ')[0],
          lastName: contactName.split(' ').slice(1).join(' ') || ' ',
          emailAddress: contactEmail,
          phones: clientData.phone ? [
            {
              phoneType: 'MOBILE',
              phoneNumber: clientData.phone
            }
          ] : undefined
        };
        
        const newContactResponse = await this.client.accountingApi.createContacts(
          this.tokenSet.access_token,
          this.tenantId,
          { contacts: [newContact] }
        );
        
        contact = newContactResponse.body.contacts[0];
      }
      
      // Prepare line items
      const lineItems = [];
      
      // Handle archived vs. active orders differently for line items
      if (order.archived) {
        // For archived orders, items are in archivedItemsData
        order.archivedItemsData.forEach(item => {
          lineItems.push({
            description: item.speciesName || 'Coral',
            quantity: item.OrderItem.quantity,
            unitAmount: parseFloat(item.OrderItem.priceAtOrder || 0),
            accountCode: '200', // Default sales account code - adjust as needed
            taxType: 'NONE'     // Adjust based on tax requirements
          });
        });
      } else {
        // For active orders, items are in the items relationship
        order.items.forEach(item => {
          lineItems.push({
            description: item.speciesName || 'Coral',
            quantity: item.OrderItem.quantity,
            unitAmount: parseFloat(item.OrderItem.priceAtOrder || 0),
            accountCode: '200', // Default sales account code - adjust as needed
            taxType: 'NONE'     // Adjust based on tax requirements
          });
        });
      }
      
      // Prepare invoice object
      const invoice = {
        type: 'ACCREC',
        contact: {
          contactID: contact.contactID
        },
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lineItems,
        reference: `Order #${order.id}`,
        status: 'DRAFT'
      };
      
      // Create invoice in Xero
      const invoiceResponse = await this.client.accountingApi.createInvoices(
        this.tokenSet.access_token,
        this.tenantId,
        { invoices: [invoice] }
      );
      
      // Return the created invoice
      const createdInvoice = invoiceResponse.body.invoices[0];
      
      return {
        success: true,
        invoice: {
          id: createdInvoice.invoiceID,
          invoiceNumber: createdInvoice.invoiceNumber,
          reference: createdInvoice.reference,
          total: createdInvoice.total,
          url: createdInvoice.onlineInvoiceUrl
        }
      };
    } catch (error) {
      console.error('Error generating Xero invoice:', error);
      return { 
        error: 'Failed to generate invoice',
        details: error.message
      };
    }
  }

  // Approve and send invoice to client
  async sendInvoice(invoiceId) {
    if (!this.client) return { error: 'Xero not configured' };
    if (!this.tenantId) return { error: 'Xero tenant ID not configured' };
    
    // Ensure we have a valid token
    const tokenStatus = await this.ensureToken();
    if (tokenStatus.error) {
      return tokenStatus;
    }
    
    try {
      // Update status to AUTHORISED
      const updateInvoice = {
        invoiceID: invoiceId,
        status: 'AUTHORISED'
      };
      
      await this.client.accountingApi.updateInvoice(
        this.tokenSet.access_token,
        this.tenantId,
        invoiceId,
        { invoices: [updateInvoice] }
      );
      
      // Send the invoice to the client
      const result = await this.client.accountingApi.emailInvoice(
        this.tokenSet.access_token,
        this.tenantId,
        invoiceId
      );
      
      return { 
        success: true,
        message: 'Invoice sent to client'
      };
    } catch (error) {
      console.error('Error sending Xero invoice:', error);
      return { 
        error: 'Failed to send invoice',
        details: error.message
      };
    }
  }

  // Get Xero connection status
  async getStatus() {
    if (!this.client) {
      return {
        connected: false,
        message: 'Xero integration not configured'
      };
    }
    
    if (!this.tenantId) {
      return {
        connected: false,
        message: 'Xero tenant not connected',
        authUrl: this.getAuthUrl()
      };
    }
    
    try {
      const tokenStatus = await this.ensureToken();
      if (tokenStatus.error) {
        return {
          connected: false,
          message: tokenStatus.error,
          authUrl: this.getAuthUrl()
        };
      }
      
      // Get organization info to verify connection
      const org = await this.client.accountingApi.getOrganisations(
        this.tokenSet.access_token,
        this.tenantId
      );
      
      return {
        connected: true,
        organization: org.body.organisations[0].name,
        tenantId: this.tenantId
      };
    } catch (error) {
      console.error('Error checking Xero status:', error);
      return {
        connected: false,
        message: 'Error connecting to Xero',
        error: error.message,
        authUrl: this.getAuthUrl()
      };
    }
  }
}

export default new XeroService();