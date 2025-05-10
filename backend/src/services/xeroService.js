// Note: TokenSet is not directly exported from openid-client in newer versions
// We'll use a plain object instead
import { XeroClient } from 'xero-node';
import dotenv from 'dotenv';
import { jwtDecode } from 'jwt-decode'; 
import { XeroToken } from '../models/XeroToken.js';

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
      scopes: ['openid', 'profile', 'email', 'accounting.settings', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
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
    this.tenantId = null;
    this.initialized = false;
    this.initializationPromise = null;
    
    // Note: we don't automatically call initialize() in the constructor
    // It needs to be explicitly awaited by the application on startup
  }

  // Explicit initialization method that returns a promise
  async initialize() {
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // If already initialized, just return a resolved promise
    if (this.initialized) {
      return Promise.resolve();
    }
    
    // Start the initialization process
    this.initializationPromise = (async () => {
      try {
        console.log('Initializing Xero service...');
        await this.loadFromDatabase();
        
        // Proactively check token validity and refresh if needed
        if (this.tokenSet) {
          try {
            const isExpired = this.client?.readTokenSet(this.tokenSet).expired();
            if (isExpired) {
              console.log('Token expired, refreshing on startup');
              await this.ensureToken();
            }
          } catch (tokenError) {
            console.error('Error checking token validity:', tokenError);
            // Continue initialization despite token validation error
          }
        }
        
        this.initialized = true;
        console.log('Xero service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Xero service:', error);
        // Reset initialization promise so we can try again
        this.initializationPromise = null;
        throw error;
      }
    })();
    
    return this.initializationPromise;
  }

  // Private method to load credentials from database
  // This is called by initialize() and shouldn't be called directly
  async loadFromDatabase() {
    try {
      console.log('Loading Xero credentials from database...');
      // Find the most recent active token
      const token = await XeroToken.findOne({
        where: { active: true },
        order: [['updatedAt', 'DESC']]
      });

      if (token) {
        // Set tenant ID
        this.tenantId = token.tenantId;
        console.log('Loaded Xero tenant ID from database:', this.tenantId);
        
        // Create a TokenSet-like object and store in memory
        this.tokenSet = {
          access_token: token.accessToken,
          refresh_token: token.refreshToken,
          id_token: token.idToken,
          expires_at: Math.floor(new Date(token.expiresAt).getTime() / 1000),
          scope: token.scope,
          token_type: token.tokenType,
          
          // Add TokenSet-like functionality
          expired: function() {
            return this.expires_at < Math.floor(Date.now() / 1000);
          },
          toJSON: function() {
            return {
              access_token: this.access_token,
              refresh_token: this.refresh_token,
              id_token: this.id_token,
              expires_in: this.expires_at - Math.floor(Date.now() / 1000),
              scope: this.scope,
              token_type: this.token_type
            };
          }
        };
        console.log('Loaded Xero token from database successfully');
        
        // Check if token is expired and will need refresh on next use
        const expiryDate = new Date(token.expiresAt);
        const now = new Date();
        if (expiryDate <= now) {
          console.log('Loaded token is expired and will be refreshed on next API call');
        } else {
          const minutesRemaining = Math.round((expiryDate - now) / 60000);
          console.log(`Loaded token is valid for approximately ${minutesRemaining} more minutes`);
        }
      } else {
        // Fallback to environment variable for tenant ID
        console.log('No token found in database, checking environment variables');
        this.tenantId = process.env.XERO_TENANT_ID;
        if (this.tenantId) {
          console.log('Using tenant ID from environment variables:', this.tenantId);
        } else {
          console.log('No Xero tenant ID available - authentication will be required');
        }
      }
    } catch (error) {
      console.error('Error loading Xero credentials from database:', error);
      // Fallback to environment variable for tenant ID
      this.tenantId = process.env.XERO_TENANT_ID;
      if (this.tenantId) {
        console.log('Using tenant ID from environment variables after database error:', this.tenantId);
      }
    }
  }

  // Check if service is properly configured
  isConfigured() {
    return !!(this.client && this.tenantId);
  }
  
  // Helper method to ensure service is initialized before any operation
  async ensureInitialized() {
    if (!this.initialized) {
      console.log('Xero service not yet initialized, initializing now...');
      await this.initialize();
    }
    return this.initialized;
  }

  // Generate authorization URL for OAuth flow
  async getAuthUrl(forceNew = false) {
    await this.ensureInitialized();
    
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
    await this.ensureInitialized();
    
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

      // Get the actual tenant ID by calling the connections endpoint
      // DO NOT use xero_userid from the token, as it's the user's ID, not the tenant ID
      try {
        console.log('Fetching actual Xero tenant ID from connections API');
        
        // Create headers for the connections API call
        const headers = {
          'Authorization': `Bearer ${this.tokenSet.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        // Call the connections API to get the tenant(s) this user has access to
        const connectionsResponse = await fetch('https://api.xero.com/connections', {
          method: 'GET',
          headers: headers
        });
        
        if (!connectionsResponse.ok) {
          const errorText = await connectionsResponse.text();
          throw new Error(`Failed to get connections: ${connectionsResponse.status}: ${errorText}`);
        }
        
        const connections = await connectionsResponse.json();
        console.log('Available Xero connections:', JSON.stringify(connections, null, 2));
        
        if (!connections || connections.length === 0) {
          throw new Error('No Xero organizations connected to this account');
        }
        
        // Use the first tenant ID or match with environment variable if specified
        let selectedTenantId = null;
        const envTenantId = process.env.XERO_TENANT_ID;
        
        if (envTenantId) {
          // Try to find a matching tenant ID from the connections if env var is set
          const matchingTenant = connections.find(conn => conn.tenantId === envTenantId);
          if (matchingTenant) {
            selectedTenantId = matchingTenant.tenantId;
            console.log(`Found matching tenant ID from environment variable: ${selectedTenantId}`);
          } else {
            console.warn(`Tenant ID ${envTenantId} from environment not found in connections`);
          }
        }
        
        // If no match or no env var, use the first tenant
        if (!selectedTenantId) {
          selectedTenantId = connections[0].tenantId;
          console.log(`Using first available tenant ID: ${selectedTenantId}`);
        }
        
        // Hardcoded tenant ID override is commented out to allow selection of the Demo Company
        // const hardcodedTenantId = "a82188c3-15ba-4255-bce8-89aab78af038";
        // if (hardcodedTenantId) {
        //   console.log(`OVERRIDE: Using hardcoded tenant ID: ${hardcodedTenantId}`);
        //   selectedTenantId = hardcodedTenantId;
        // }
        
        if (!selectedTenantId) {
          throw new Error('Failed to determine tenant ID from connections');
        }
        
        this.tenantId = selectedTenantId;
        console.log('Final tenant ID selected for API calls:', this.tenantId);
        
      } catch (connectionError) {
        console.error('Error getting Xero connections:', connectionError);
        return { error: 'Failed to get Xero organizations', details: connectionError.message };
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
        
        // Log tenant ID for debugging
        console.log('Xero tenantId for API call:', this.tenantId);
        console.log('Xero access token length:', this.tokenSet.access_token ? this.tokenSet.access_token.length : 'undefined');
        
        // Create headers object with the proper tenant ID header and accept header
        const headers = {
          'Authorization': `Bearer ${this.tokenSet.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Xero-Tenant-Id': this.tenantId  // Note: Using proper capitalization
        };
        
        console.log('Request headers:', JSON.stringify(headers, null, 2).replace(this.tokenSet.access_token, '[REDACTED]'));
        
        // Call the API directly with the proper headers
        const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', { 
          method: 'GET',
          headers: headers
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API call failed with status ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Connected to organization:', data.Organisations[0].Name);
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

  // Save token set to database with improved error handling
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

  // Load token set from database (used by ensureToken)
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

      // Create a TokenSet-like object
      const tokenSet = {
        access_token: tokenRecord.accessToken,
        refresh_token: tokenRecord.refreshToken,
        id_token: tokenRecord.idToken,
        expires_at: Math.floor(new Date(tokenRecord.expiresAt).getTime() / 1000),
        scope: tokenRecord.scope,
        token_type: tokenRecord.tokenType,
        
        // Add TokenSet-like functionality
        expired: function() {
          return this.expires_at < Math.floor(Date.now() / 1000);
        },
        toJSON: function() {
          return {
            access_token: this.access_token,
            refresh_token: this.refresh_token,
            id_token: this.id_token,
            expires_in: this.expires_at - Math.floor(Date.now() / 1000),
            scope: this.scope,
            token_type: this.token_type
          };
        }
      };
      
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
    await this.ensureInitialized();
    
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
    await this.ensureInitialized();
    
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

      // Create headers for API call with proper capitalization for header names
      const headers = {
        'Authorization': `Bearer ${this.tokenSet.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Xero-Tenant-Id': tenantIdString
      };

      // Find if contact already exists using direct API call
      let contactsUrl = `https://api.xero.com/api.xro/2.0/Contacts?where=Name=="${encodeURIComponent(contactName)}"`;
      if (contactEmail) {
        contactsUrl += ` OR EmailAddress=="${encodeURIComponent(contactEmail)}"`;
      }
      
      const contactsResponse = await fetch(contactsUrl, {
        method: 'GET',
        headers: headers
      });
      
      if (!contactsResponse.ok) {
        const errorText = await contactsResponse.text();
        throw new Error(`API call failed with status ${contactsResponse.status}: ${errorText}`);
      }
      
      const contactsData = await contactsResponse.json();

      // Use existing contact or create new one
      if (contactsData.Contacts && contactsData.Contacts.length > 0) {
        contact = contactsData.Contacts[0];
      } else {
        // Create new contact using direct API
        const newContact = {
          Name: contactName,
          FirstName: contactName.split(' ')[0],
          LastName: contactName.split(' ').slice(1).join(' ') || ' ',
          EmailAddress: contactEmail
        };
        
        // Add phone if available
        if (clientData.phone) {
          newContact.Phones = [
            {
              PhoneType: "MOBILE",
              PhoneNumber: clientData.phone
            }
          ];
        }
        
        // Create contact via direct API call
        const createContactResponse = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ Contacts: [newContact] })
        });
        
        if (!createContactResponse.ok) {
          const errorText = await createContactResponse.text();
          throw new Error(`Contact creation failed with status ${createContactResponse.status}: ${errorText}`);
        }
        
        const createContactData = await createContactResponse.json();
        contact = createContactData.Contacts[0];
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

      // Prepare line items in Xero API format with proper capitalization
      const xeroLineItems = lineItems.map(item => ({
        Description: item.description,
        Quantity: item.quantity,
        UnitAmount: item.unitAmount,
        AccountCode: item.accountCode,
        TaxType: item.taxType
      }));
      
      // Prepare invoice object with proper field capitalization for Xero API
      const invoice = {
        Type: 'ACCREC',
        Contact: {
          ContactID: contact.ContactID
        },
        Date: new Date().toISOString().split('T')[0],
        DueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        LineItems: xeroLineItems,
        Reference: `Order #${order.id}`,
        Status: 'DRAFT'
      };

      // Create invoice using direct API call
      const invoiceResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ Invoices: [invoice] })
      });
      
      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        throw new Error(`Invoice creation failed with status ${invoiceResponse.status}: ${errorText}`);
      }
      
      const invoiceData = await invoiceResponse.json();
      
      // Return the created invoice
      const createdInvoice = invoiceData.Invoices[0];

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
    await this.ensureInitialized();
    
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

      // Create headers for API call with proper capitalization
      const headers = {
        'Authorization': `Bearer ${this.tokenSet.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Xero-Tenant-Id': tenantIdString
      };

      // First update the invoice to AUTHORISED status
      const updateInvoice = {
        InvoiceID: invoiceId,
        Status: 'AUTHORISED'
      };

      const updateResponse = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ Invoices: [updateInvoice] })
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Invoice update failed with status ${updateResponse.status}: ${errorText}`);
      }
      
      // Then email the invoice
      const emailResponse = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}/Email`, {
        method: 'POST',
        headers: headers
      });
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(`Invoice email failed with status ${emailResponse.status}: ${errorText}`);
      }

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
    await this.ensureInitialized();
    
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

      // Create headers object with the proper tenant ID header
      const headers = {
        'Authorization': `Bearer ${this.tokenSet.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Xero-Tenant-Id': tenantIdString
      };
      
      // Call the API directly with the proper headers
      const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', { 
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        connected: true,
        organization: data.Organisations[0].Name,
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

  // Get all invoices for the current tenant
  async getInvoices() {
    await this.ensureInitialized();
    
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
        return { error: 'Xero tenant ID not available for fetching invoices' };
      }
      console.log('Using stored tenant ID for fetching invoices:', tenantIdString);

      // Create headers for API call with proper capitalization
      const headers = {
        'Authorization': `Bearer ${this.tokenSet.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Xero-Tenant-Id': tenantIdString
      };

      // Get invoices using direct API call
      const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }
      
      const invoicesData = await response.json();
      
      // Transform the response to a more frontend-friendly format
      const invoices = invoicesData.Invoices.map(invoice => ({
        id: invoice.InvoiceID,
        invoiceNumber: invoice.InvoiceNumber,
        reference: invoice.Reference,
        date: invoice.Date,
        dueDate: invoice.DueDate,
        status: invoice.Status,
        total: invoice.Total,
        amountDue: invoice.AmountDue,
        contact: {
          id: invoice.Contact.ContactID,
          name: invoice.Contact.Name
        },
        url: invoice.OnlineInvoiceUrl || null,
        lineItems: (invoice.LineItems || []).map(item => ({
          description: item.Description,
          quantity: item.Quantity,
          unitAmount: item.UnitAmount,
          lineAmount: item.LineAmount
        }))
      }));

      return {
        success: true,
        invoices: invoices
      };
    } catch (error) {
      console.error('Error fetching Xero invoices:', error);
      return {
        error: 'Failed to fetch invoices',
        details: error.message
      };
    }
  }

  // Disconnect from Xero
  async disconnect() {
    await this.ensureInitialized();
    try {
      // Delete all tokens instead of trying to deactivate them
      await XeroToken.destroy({
        where: {} // Empty where clause deletes all records
      });

      // Clear in-memory token and tenant ID
      this.tokenSet = null;
      this.tenantId = null;

      // No longer using file-based tokens - database only

      console.log('Disconnected from Xero');
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting from Xero:', error);
      return { error: 'Failed to disconnect from Xero' };
    }
  }
}

export default new XeroService();
