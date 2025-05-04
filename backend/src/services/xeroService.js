import { XeroClient } from 'xero-node';
import env from '../config/env.js';

// Initialize Xero client
const initXero = () => {
  try {
    // Check if Xero is configured with all required values
    if (!env.xero.isConfigured || 
        !env.xero.clientId || 
        !env.xero.clientSecret || 
        !env.xero.redirectUri) {
      console.warn('Xero integration not fully configured. Check environment variables.');
      console.warn('Xero integration will not be available.');
      return null;
    }

    // Create a proper Xero client with the provided credentials
    const xero = new XeroClient({
      clientId: env.xero.clientId,
      clientSecret: env.xero.clientSecret,
      redirectUris: [env.xero.redirectUri],
      scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'accounting.settings', 'offline_access'],
      state: 'returnToHome', // A random state for CSRF protection
      httpTimeout: 10000 // 10 second timeout
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
    this.tenantId = env.xero.tenantId;
    this.tokenSetKey = 'xero_token_set';
  }

  isConfigured() {
    return !!(this.client && this.tenantId);
  }

  // Generate authorization URL for OAuth flow
  getAuthUrl() {
    if (!this.client) return { error: 'Xero not configured' };
    
    try {
      // Define the redirectUrl for the OAuth flow - must match what's configured in Xero
      // Hardcoding the redirect URI to ensure consistency
      const redirectUri = env.xero.redirectUri || 'https://dev.fragglerock.shop/api/xero/callback';
      
      // Log key information for debugging
      console.log('Using redirectUri:', redirectUri);
      console.log('Client ID configured:', !!this.client.config.clientId);
      
      // Use our domain's redirect URL for the OAuth flow
      let consentUrl;
      
      // Create directly with static URL if buildConsentUrl is not reliable
      const baseUrl = 'https://login.xero.com/identity/connect/authorize';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.client.config.clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email accounting.transactions accounting.contacts accounting.settings offline_access', 
        state: 'xero-auth-' + Date.now()
      });
      
      consentUrl = `${baseUrl}?${params.toString()}`;
      console.log('Generated consent URL:', consentUrl);
      
      return { url: consentUrl };
    } catch (error) {
      console.error('Error generating Xero auth URL:', error);
      return { error: 'Failed to generate authorization URL: ' + error.message };
    }
  }

  // Complete OAuth flow with callback code
  async handleCallback(callbackUrl) {
    if (!this.client) return { error: 'Xero not configured' };
    
    try {
      console.log('Processing Xero callback URL:', callbackUrl);
      
      // Extract the URL parts from the callback
      const callbackURL = new URL(callbackUrl);
      const code = callbackURL.searchParams.get('code');
      
      if (!code) {
        return { error: 'No authorization code found in callback URL' };
      }
      
      // Get the redirect URI that matches what we configured in Xero
      const redirectUri = env.xero.redirectUri || 'https://dev.fragglerock.shop/api/xero/callback';
      
      // Manually exchange the code for tokens instead of using apiCallback
      console.log('Manually exchanging authorization code for tokens...');
      
      try {
        // Create a basic request to the Xero token endpoint
        const response = await fetch('https://identity.xero.com/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(
              `${this.client.config.clientId}:${this.client.config.clientSecret}`
            ).toString('base64')
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
          }).toString()
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token exchange failed:', response.status, errorText);
          return { 
            error: 'Failed to exchange authorization code for tokens',
            details: `HTTP Status: ${response.status}, Response: ${errorText}`
          };
        }
        
        // Parse the token response
        const rawTokenSet = await response.json();
        
        // Ensure there's an expires_at field for easier expiry checking
        if (rawTokenSet.expires_in && !rawTokenSet.expires_at) {
          rawTokenSet.expires_at = Date.now() + rawTokenSet.expires_in * 1000;
        }
        
        this.tokenSet = rawTokenSet;
        console.log('Token received:', !!this.tokenSet, 'with expiry:', 
                    this.tokenSet.expires_at ? 
                    new Date(this.tokenSet.expires_at).toISOString() : 'none');
        
        // Store the token set
        await this.saveTokenSet(this.tokenSet);
        
        // If tenant ID is not set, get connected tenants
        if (!this.tenantId) {
          console.log('Getting connected tenants...');
          
          // Get the list of connected Xero organizations
          const tenantsResponse = await fetch('https://api.xero.com/connections', {
            headers: {
              'Authorization': `Bearer ${this.tokenSet.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!tenantsResponse.ok) {
            const errorText = await tenantsResponse.text();
            console.error('Failed to get tenants:', tenantsResponse.status, errorText);
            return { 
              error: 'Failed to get connected Xero organizations',
              details: `HTTP Status: ${tenantsResponse.status}`
            };
          }
          
          const tenants = await tenantsResponse.json();
          console.log('Connected tenants:', tenants.length);
          
          if (tenants.length > 0) {
            this.tenantId = tenants[0].tenantId;
            console.log('Using Xero tenant ID:', this.tenantId);
            
            // Save the updated tenant ID immediately
            await this.saveTokenSet(this.tokenSet);
          } else {
            return { error: 'No Xero organizations connected' };
          }
        }
        
        return { 
          success: true, 
          tenant: this.tenantId,
          message: 'Successfully authenticated with Xero'
        };
      } catch (tokenError) {
        console.error('Token exchange error:', tokenError);
        return { 
          error: 'Error during token exchange',
          details: tokenError.message
        };
      }
    } catch (error) {
      console.error('Error handling Xero callback:', error);
      return { 
        error: 'Failed to authenticate with Xero', 
        details: error.message,
        stack: error.stack
      };
    }
  }

  // Save token set and tenant ID to database or other storage
  async saveTokenSet(tokenSet) {
    try {
      // Store in memory
      this.tokenSet = tokenSet;
      
      // Also store in file system for persistence
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const dataPath = path.join(__dirname, '..', '..', 'data');
      const tokenFilePath = path.join(dataPath, 'xero-token.json');
      
      // Create directory if it doesn't exist
      await fs.mkdir(dataPath, { recursive: true });
      
      // Save token data with tenant ID
      const dataToSave = {
        tokenSet: tokenSet,
        tenantId: this.tenantId
      };
      
      // Write token to file
      await fs.writeFile(
        tokenFilePath, 
        JSON.stringify(dataToSave, null, 2),
        'utf8'
      );
      
      console.log('Xero TokenSet and TenantId saved to file and memory');
    } catch (error) {
      console.error('Error saving Xero token set:', error);
    }
  }

  // Load token set and tenant ID from storage
  async loadTokenSet() {
    try {
      // If we have it in memory, use that
      if (this.tokenSet) {
        return this.tokenSet;
      }
      
      // Otherwise try to load from file
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const tokenFilePath = path.join(__dirname, '..', '..', 'data', 'xero-token.json');
      
      try {
        const fileData = await fs.readFile(tokenFilePath, 'utf8');
        const parsedData = JSON.parse(fileData);
        
        // Check if the file contains the new format with both token and tenant ID
        if (parsedData.tokenSet) {
          this.tokenSet = parsedData.tokenSet;
          
          // Also restore the tenant ID
          if (parsedData.tenantId) {
            this.tenantId = parsedData.tenantId;
            console.log('Xero tenant ID loaded from file:', this.tenantId);
          }
        } else {
          // Old format - just the token
          this.tokenSet = parsedData;
        }
        
        console.log('Xero TokenSet loaded from file');
        return this.tokenSet;
      } catch (readError) {
        if (readError.code !== 'ENOENT') {
          console.error('Error reading Xero token file:', readError);
        }
        return null;
      }
    } catch (error) {
      console.error('Error loading Xero token set:', error);
      return null;
    }
  }

  // Ensure we have a valid token before making API calls
  async ensureToken() {
    if (!this.client) return { error: 'Xero not configured' };
    
    try {
      // Load token set if not in memory
      if (!this.tokenSet) {
        await this.loadTokenSet();
        
        // If still no token, auth is required
        if (!this.tokenSet) {
          const authUrlResult = this.getAuthUrl();
          return { 
            error: 'Authentication required', 
            authUrl: authUrlResult.url,
            authInfo: authUrlResult
          };
        }
      }
      
      // Ensure we have a tenant ID (either from env, memory, or loaded from file)
      if (!this.tenantId) {
        // Check if we can get tenant ID from the environment
        if (env.xero.tenantId) {
          this.tenantId = env.xero.tenantId;
          console.log('Using tenant ID from environment:', this.tenantId);
        } else {
          console.warn('No tenant ID available - authorization may fail');
        }
      }
      
      // Check if token needs refresh
      try {
        // Instead of using client.readTokenSet, directly check token expiry
        const expiresAt = this.tokenSet.expires_at || 
                         (this.tokenSet.expires_in ? 
                           Date.now() + this.tokenSet.expires_in * 1000 : 
                           null);
                           
        // Log token details for debugging
        console.log('Token details:', {
          hasAccessToken: !!this.tokenSet.access_token,
          hasRefreshToken: !!this.tokenSet.refresh_token,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'unknown'
        });
        
        const isExpired = expiresAt && Date.now() > expiresAt;
        
        if (isExpired) {
          console.log('Refreshing Xero token - token expired');
          
          // Manually refresh the token instead of using client.refreshToken
          try {
            const response = await fetch('https://identity.xero.com/connect/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(
                  `${this.client.config.clientId}:${this.client.config.clientSecret}`
                ).toString('base64')
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.tokenSet.refresh_token
              }).toString()
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Token refresh failed:', response.status, errorText);
              throw new Error(`HTTP Status: ${response.status}, Response: ${errorText}`);
            }
            
            // Parse the token response
            const rawTokenSet = await response.json();
            
            // Ensure there's an expires_at field for easier expiry checking
            if (rawTokenSet.expires_in && !rawTokenSet.expires_at) {
              rawTokenSet.expires_at = Date.now() + rawTokenSet.expires_in * 1000;
            }
            
            this.tokenSet = rawTokenSet;
            console.log('Token refreshed successfully with expiry:', 
                        this.tokenSet.expires_at ? 
                        new Date(this.tokenSet.expires_at).toISOString() : 'none');
            
            // Store the token set
            await this.saveTokenSet(this.tokenSet);
          } catch (refreshError) {
            console.error('Manual token refresh failed:', refreshError);
            throw refreshError;
          }
        }
      } catch (tokenError) {
        console.error('Error reading/refreshing token:', tokenError);
        const authUrlResult = this.getAuthUrl();
        return { 
          error: 'Token expired or invalid', 
          authUrl: authUrlResult.url,
          tokenError: tokenError.message
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error ensuring Xero token:', error);
      return { 
        error: 'Token validation failed',
        details: error.message
      };
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
    
    // Check if client is properly initialized with all required properties
    if (!this.client.config || !this.client.config.clientId) {
      return {
        connected: false,
        message: 'Xero configuration incomplete'
      };
    }
    
    // Log token diagnostic info
    console.log('Checking Xero status with token info:', {
      hasToken: !!this.tokenSet,
      hasAccessToken: this.tokenSet ? !!this.tokenSet.access_token : false,
      hasRefreshToken: this.tokenSet ? !!this.tokenSet.refresh_token : false,
      expiresAt: this.tokenSet && this.tokenSet.expires_at ? 
                 new Date(this.tokenSet.expires_at).toISOString() : 'unknown',
      tenantId: this.tenantId || 'not set'
    });
    
    if (!this.tenantId) {
      const authUrlResult = this.getAuthUrl();
      return {
        connected: false,
        message: 'Xero tenant not connected',
        authUrl: authUrlResult.error ? undefined : authUrlResult.url
      };
    }
    
    try {
      const tokenStatus = await this.ensureToken();
      if (tokenStatus.error) {
        const authUrlResult = this.getAuthUrl();
        return {
          connected: false,
          message: tokenStatus.error,
          authUrl: authUrlResult.error ? undefined : authUrlResult.url
        };
      }
      
      // Get organization info to verify connection
      // Use fetch directly instead of the Xero client to avoid format issues
      const orgResponse = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
        headers: {
          'Authorization': `Bearer ${this.tokenSet.access_token}`,
          'Accept': 'application/json',
          'Xero-Tenant-Id': this.tenantId
        }
      });
      
      if (!orgResponse.ok) {
        console.error('Error fetching organization details:', orgResponse.status);
        
        // If we get a 401, try to refresh the token once more
        if (orgResponse.status === 401) {
          console.log('Received 401, attempting token refresh and retry...');
          
          // Force token refresh
          try {
            const response = await fetch('https://identity.xero.com/connect/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(
                  `${this.client.config.clientId}:${this.client.config.clientSecret}`
                ).toString('base64')
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.tokenSet.refresh_token
              }).toString()
            });
            
            if (response.ok) {
              const rawTokenSet = await response.json();
              
              // Ensure there's an expires_at field for easier expiry checking
              if (rawTokenSet.expires_in && !rawTokenSet.expires_at) {
                rawTokenSet.expires_at = Date.now() + rawTokenSet.expires_in * 1000;
              }
              
              this.tokenSet = rawTokenSet;
              await this.saveTokenSet(this.tokenSet);
              console.log('Token refreshed and saved after 401');
              
              // Try the organization request again
              const retryResponse = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
                headers: {
                  'Authorization': `Bearer ${this.tokenSet.access_token}`,
                  'Accept': 'application/json',
                  'Xero-Tenant-Id': this.tenantId
                }
              });
              
              if (retryResponse.ok) {
                const orgData = await retryResponse.json();
                const org = { body: { organisations: orgData.Organisations } };
                
                return {
                  connected: true,
                  organization: org.body.organisations[0].name,
                  tenantId: this.tenantId,
                  refreshed: true
                };
              } else {
                console.error('Retry after token refresh still failed:', retryResponse.status);
              }
            } else {
              console.error('Token refresh attempt failed with status:', response.status);
              try {
                const errorContent = await response.text();
                console.error('Token refresh error details:', errorContent);
              } catch (e) {
                // Ignore error reading response
              }
            }
          } catch (refreshError) {
            console.error('Error during 401 recovery attempt:', refreshError);
          }
        }
        
        throw new Error(`Failed to get organization details: ${orgResponse.status}`);
      }
      
      const orgData = await orgResponse.json();
      const org = { body: { organisations: orgData.Organisations } };
      
      return {
        connected: true,
        organization: org.body.organisations[0].name,
        tenantId: this.tenantId
      };
    } catch (error) {
      console.error('Error checking Xero status:', error);
      const authUrlResult = this.getAuthUrl();
      return {
        connected: false,
        message: 'Error connecting to Xero',
        error: error.message,
        authUrl: authUrlResult.error ? undefined : authUrlResult.url
      };
    }
  }
}

export default new XeroService();