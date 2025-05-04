import * as openid from 'openid-client';
const { TokenSet } = openid;
import { XeroClient } from 'xero-node';
import dotenv from 'dotenv';
import { jwtDecode } from 'jwt-decode'; // Re-import jwt-decode
import { XeroToken } from '../models/XeroToken.js';

dotenv.config();

// Try to delete the file-based token if it exists
const deleteFileBasedToken = async () => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const tokenFilePath = path.join(__dirname, '../../../data/xero-token.json');

    await fs.unlink(tokenFilePath).catch(() => {
      console.log('No file-based token to delete or unable to delete');
    });

    console.log('Deleted file-based token if it existed');
  } catch (fsError) {
    console.log('Error attempting to delete file-based token:', fsError.message);
  }
};

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

    // Try to delete any old file-based token
    deleteFileBasedToken();

    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_REDIRECT_URI],
      scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
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

    // Always try to load from database first, fallback to env var
    this.tenantId = null;
    this.loadTenantIdFromDatabase();

    // If database load fails, use environment variable as fallback
    if (!this.tenantId) {
      console.log('No tenant ID found in database, checking environment variables');
      this.tenantId = process.env.XERO_TENANT_ID;
      if (this.tenantId) {
        console.log('Using tenant ID from environment variables:', this.tenantId);
      }
    }
  }

  // Load tenant ID from database
  async loadTenantIdFromDatabase() {
    try {
      // Find the most recent active token
      const token = await XeroToken.findOne({
        where: { active: true },
        order: [['updatedAt', 'DESC']]
      });

      if (token && token.tenantId) {
        this.tenantId = token.tenantId;
        console.log('Loaded Xero tenant ID from database:', this.tenantId);
      }
    } catch (error) {
      console.error('Error loading tenant ID from database:', error);
    }
  }

  isConfigured() {
    return !!(this.client && this.tenantId);
  }

  // Generate authorization URL for OAuth flow
  async getAuthUrl(forceNew = false) {
    if (!this.client) return { error: 'Xero not configured' };

    try {
      // If forceNew is true, temporarily clear the tenant ID to force a new auth flow
      if (forceNew) {
        console.log('Forcing new Xero authentication flow');

        try {
          // Delete all tokens instead of deactivating them to avoid constraint issues
          await XeroToken.destroy({
            where: {} // Empty where clause deletes all records
          });
          console.log('Deleted all existing tokens for fresh auth');
        } catch (err) {
          console.error('Error deleting tokens:', err);
        }

        // Clear in-memory token and tenant ID
        this.tokenSet = null;
        this.tenantId = null;
      }

      console.log('Building Xero consent URL with client config:', {
        clientId: this.client.clientId,
        redirectUris: this.client.redirectUris,
        scopes: this.client.scopes
      });

      // Await the Promise returned by buildConsentUrl()
      const rawConsentUrl = await this.client.buildConsentUrl();
      console.log('Raw Xero consent URL:', rawConsentUrl, 'Type:', typeof rawConsentUrl);

      // Ensure we return a string URL
      let consentUrl;
      if (typeof rawConsentUrl === 'object' && rawConsentUrl !== null) {
        // If it's an object, extract the URL property if it exists
        if (rawConsentUrl.url) {
          consentUrl = rawConsentUrl.url;
          console.log('Extracted URL from object.url property:', consentUrl);
        } else {
          // Try to find a string URL property in the object
          const urlProp = Object.entries(rawConsentUrl)
            .find(([_, v]) => typeof v === 'string' && v.startsWith('http'));

          if (urlProp) {
            consentUrl = urlProp[1];
            console.log('Found URL property:', urlProp[0], consentUrl);
          } else {
            // Last resort fallback
            consentUrl = String(rawConsentUrl);
            console.log('Converted object to string:', consentUrl);
          }
        }
      } else {
        consentUrl = rawConsentUrl;
      }

      console.log('Final Xero consent URL:', consentUrl);
      return { url: consentUrl };
    } catch (error) {
      console.error('Error generating Xero auth URL:', error);
      return { error: 'Failed to generate authorization URL' };
    }
  }

  // Complete OAuth flow with callback code
  async handleCallback(callbackUrl) {
    if (!this.client) return { error: 'Xero not configured' };

    console.log('Handling Xero callback with URL:', callbackUrl);

    try {
      // Exchange authorization code for tokens
      console.log('Calling apiCallback with URL');
      this.tokenSet = await this.client.apiCallback(callbackUrl);
      console.log('Received token set:', this.tokenSet ? 'Token received' : 'No token received');

      if (!this.tokenSet) {
        console.error('No token received from Xero callback');
        return { error: 'No token received from Xero' };
      }

      // Decode the access token to get the tenant ID directly, DO NOT call updateTenants()
      try {
        const decodedToken = jwtDecode(this.tokenSet.access_token);
        console.log('Decoded Access Token:', decodedToken);

        // Extract tenant ID - Prioritize 'xero_userid'
        let extractedTenantId = null;
        if (decodedToken.xero_userid && typeof decodedToken.xero_userid === 'string' && decodedToken.xero_userid.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
           extractedTenantId = decodedToken.xero_userid;
           console.log('Extracted tenant ID from xero_userid claim:', extractedTenantId);
        } else {
           // Fallback: Look for any UUID in the token claims
           const uuidMatch = JSON.stringify(decodedToken).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
           if (uuidMatch) {
               extractedTenantId = uuidMatch[0];
               console.warn('Extracted tenant ID using UUID pattern fallback:', extractedTenantId);
           }
        }

        if (!extractedTenantId) {
          console.error('Could not extract tenant ID from access token claims.');
          return { error: 'Failed to determine Xero tenant ID from token' };
        }

        this.tenantId = extractedTenantId;
        console.log('Stored Tenant ID from decoded token:', this.tenantId);

      } catch (decodeError) {
        console.error('Error decoding access token:', decodeError);
        return { error: 'Failed to decode access token', details: decodeError.message };
      }

      // Store the token set with the extracted tenant ID
      console.log('Saving token set to database with extracted tenant ID');
      await this.saveTokenSet(this.tokenSet);

      // Verify the connection by making a test API call using the stored plain tenant ID
      try {
        console.log('Testing connection with API call using stored tenant ID:', this.tenantId);
        if (!this.tenantId) {
            throw new Error("Cannot test API call without a tenant ID.");
        }
        const org = await this.client.accountingApi.getOrganisations(
          this.tokenSet.access_token,
          this.tenantId // Use the stored plain tenant ID directly
        );
        console.log('Connected to organization:', org.body.organisations[0].name);
      } catch (apiError) {
        console.error('API test call failed:', apiError);
        // If the test call fails immediately after connection, it's a significant issue.
        // Return an error here instead of continuing silently.
        return { error: 'Xero API test call failed after connection', details: apiError.message || apiError };
      }

      // If test call succeeded
      return { success: true, tenant: this.tenantId };
    } catch (error) {
      console.error('Error handling Xero callback:', error);
      console.error('Error details:', error.message, error.stack);
      return { error: 'Failed to authenticate with Xero', details: error.message };
    }
  }

  // Save token set to database
  async saveTokenSet(tokenSet) {
    try {
      // Convert TokenSet to plain object
      const tokenData = tokenSet.toJSON ? tokenSet.toJSON() : tokenSet;

      try {
        // Delete all existing tokens for this tenant
        // This is a more reliable approach than updating
        await XeroToken.destroy({
          where: { tenantId: this.tenantId }
        });

        console.log('Deleted all existing tokens for this tenant');

        // Add a small delay to ensure the deletion completes
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create new token record
        await XeroToken.create({
          tenantId: this.tenantId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token, // Fixed: Using refresh_token instead of refreshToken
          idToken: tokenData.id_token,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
          active: true
        });

        console.log('Created new Xero token successfully');
      } catch (dbError) {
        console.error('Database operation failed, attempting fallback approach:', dbError);

        // Fallback approach - create with a slightly different tenant ID if needed
        // This allows the app to continue working even if there's a database issue
        try {
          // Try with a unique tenant ID suffix to avoid constraint issues
          await XeroToken.create({
            tenantId: `${this.tenantId}-${Date.now().toString().slice(-4)}`,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token, // Fixed: Using refresh_token instead of refreshToken
            idToken: tokenData.id_token,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            scope: tokenData.scope,
            tokenType: tokenData.token_type,
            active: true
          });

          console.log('Created new Xero token with fallback approach');
        } catch (fallbackError) {
          console.error('Even fallback token creation failed:', fallbackError);
          throw fallbackError; // Re-throw to be caught by outer catch
        }
      }

      // Store in memory for current session regardless of DB success
      this.tokenSet = tokenSet;
      console.log('Xero TokenSet saved to database successfully');
    } catch (error) {
      console.error('Error saving Xero token to database:', error);
      // Don't rethrow - just log the error but continue with in-memory token
      console.log('Will continue with in-memory token only');
      this.tokenSet = tokenSet; // Still keep the token in memory
    }
  }

  // Load token set from database
  async loadTokenSet() {
    try {
      if (!this.tenantId) {
        console.log('No tenant ID available, cannot load token');
        return null;
      }

      // Find active token for this tenant
      const tokenRecord = await XeroToken.findOne({
        where: { tenantId: this.tenantId, active: true },
        order: [['updatedAt', 'DESC']]
      });

      if (!tokenRecord) {
        console.log('No active Xero token found in database');
        return null;
      }

      // Convert to TokenSet format
      const tokenSet = new TokenSet({
        access_token: tokenRecord.accessToken,
        refresh_token: tokenRecord.refreshToken, // Fixed: Using refresh_token instead of refreshToken
        id_token: tokenRecord.idToken,
        expires_at: Math.floor(new Date(tokenRecord.expiresAt).getTime() / 1000),
        scope: tokenRecord.scope,
        token_type: tokenRecord.tokenType
      });

      // Store in memory for current session
      this.tokenSet = tokenSet;
      return tokenSet;
    } catch (error) {
      console.error('Error loading Xero token from database:', error);
      return null;
    }
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
          const authUrlResult = await this.getAuthUrl();
          return { error: 'Authentication required', authUrl: authUrlResult };
        }
      }

      // Check if token refresh is needed
      if (this.client.readTokenSet(this.tokenSet).expired()) {
        try {
          console.log('Refreshing Xero token');
          const oldRefreshToken = this.tokenSet.refresh_token;
          this.tokenSet = await this.client.refreshToken(this.tokenSet);
          console.log('Token refreshed successfully');

          // If for some reason refresh_token is missing from the refreshed token,
          // use the old one (some OAuth providers don't always return a new refresh token)
          if (!this.tokenSet.refresh_token && oldRefreshToken) {
            console.log('No refresh token in response, using previous refresh token');
            this.tokenSet.refresh_token = oldRefreshToken;
          }

          // Debug log to check token structure after refresh
          console.log('Token structure after refresh:', 
            Object.keys(this.tokenSet).join(', '), 
            'Has refresh_token:', !!this.tokenSet.refresh_token);

          await this.saveTokenSet(this.tokenSet);
        } catch (refreshError) {
          console.error('Token refresh failed, forcing re-authentication:', refreshError);
          // Force re-auth by clearing everything and returning error
          this.tokenSet = null;
          this.tenantId = null;

          // Delete all tokens in DB since they're invalid
          await XeroToken.destroy({
            where: {} // Empty where clause deletes all records
          });

          const authUrlResult = await this.getAuthUrl();
          return { error: 'Authentication required (token expired)', authUrl: authUrlResult };
        }
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
      // Use the stored plain tenant ID directly
      const tenantIdString = this.tenantId;
      if (!tenantIdString) {
        return { error: 'Xero tenant ID not available for invoice generation' };
      }
      console.log('Using stored tenant ID for invoice API call:', tenantIdString);

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
        tenantIdString,
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
          tenantIdString,
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
        tenantIdString,
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
      // Use the stored plain tenant ID directly
      const tenantIdString = this.tenantId;
       if (!tenantIdString) {
        return { error: 'Xero tenant ID not available for sending invoice' };
      }
      console.log('Using stored tenant ID for invoice send API call:', tenantIdString);

      // Update status to AUTHORISED
      const updateInvoice = {
        invoiceID: invoiceId,
        status: 'AUTHORISED'
      };

      await this.client.accountingApi.updateInvoice(
        this.tokenSet.access_token,
        tenantIdString,
        invoiceId,
        { invoices: [updateInvoice] }
      );

      // Send the invoice to the client
      const result = await this.client.accountingApi.emailInvoice(
        this.tokenSet.access_token,
        tenantIdString,
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
      const authUrlResult = await this.getAuthUrl();
      return {
        connected: false,
        message: 'Xero tenant not connected',
        authUrl: authUrlResult
      };
    }

    try {
      const tokenStatus = await this.ensureToken();
      if (tokenStatus.error) {
        const authUrlResult = await this.getAuthUrl();
        return {
          connected: false,
          message: tokenStatus.error,
          authUrl: authUrlResult
        };
      }

      // Get organization info to verify connection using the stored plain tenant ID
      const tenantIdString = this.tenantId;
       if (!tenantIdString) {
        // This case should ideally be caught earlier, but double-check
         const authUrlResult = await this.getAuthUrl();
         return {
           connected: false,
           message: 'Xero tenant ID not available for status check',
           authUrl: authUrlResult
         };
      }
      console.log('Using stored tenant ID for status API call:', tenantIdString);

      const org = await this.client.accountingApi.getOrganisations(
        this.tokenSet.access_token,
        tenantIdString // Use the stored plain tenant ID directly
      );

      return {
        connected: true,
        organization: org.body.organisations[0].name,
        tenantId: this.tenantId
      };
    } catch (error) {
      console.error('Error checking Xero status:', error);
      const authUrlResult = await this.getAuthUrl();
      return {
        connected: false,
        message: 'Error connecting to Xero',
        error: error.message,
        authUrl: authUrlResult
      };
    }
  }

  // Disconnect from Xero
  async disconnect() {
    try {
      // Delete all tokens instead of trying to deactivate them
      await XeroToken.destroy({
        where: {} // Empty where clause deletes all records
      });

      // Clear in-memory token and tenant ID
      this.tokenSet = null;
      this.tenantId = null;

      // Try to delete the file-based token if it exists
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const tokenFilePath = path.join(__dirname, '../../../data/xero-token.json');

        await fs.unlink(tokenFilePath).catch(() => {
          console.log('No file-based token to delete or unable to delete');
        });

        console.log('Deleted file-based token if it existed');
      } catch (fsError) {
        console.log('Error attempting to delete file-based token:', fsError.message);
      }

      console.log('Disconnected from Xero');
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting from Xero:', error);
      return { error: 'Failed to disconnect from Xero' };
    }
  }
}

export default new XeroService();
