# Xero Integration Setup Guide

This guide walks you through setting up the Xero integration for the Coral Management System.

## Prerequisites

1. A Xero developer account (can be created at https://developer.xero.com/)
2. An app registered in the Xero developer portal

## Creating a Xero App

1. Log in to the [Xero Developer Portal](https://developer.xero.com/)
2. Go to "Apps" and click "New app"
3. Complete the app creation form:
   - App name: "Coral Management System" (or your preferred name)
   - App URL: Your application's base URL
   - Redirect URI: `https://your-backend-url/api/xero/callback`
   - Select scopes: 
     - openid
     - profile
     - email
     - accounting.transactions
     - accounting.contacts
     - offline_access

## Setting Up Environment Variables

Add the following environment variables to your backend `.env` file:

```
XERO_CLIENT_ID=your-client-id-from-xero-developer-portal
XERO_CLIENT_SECRET=your-client-secret-from-xero-developer-portal
XERO_REDIRECT_URI=https://your-backend-url/api/xero/callback
```

## Connecting to Xero

1. Access the Orders page in your application
2. If Xero is not connected, you'll see a "Xero Not Connected" indicator
3. To connect, use the API endpoint `/api/xero/auth` to initiate the OAuth flow
4. Follow the authorization process in Xero
5. After successful authorization, you'll be redirected back to your application

## Using the Xero Integration

Once connected, you'll be able to:

1. Generate invoices for orders by clicking the "Generate Invoice" button on paid orders
2. Invoices will be created in your Xero account and can be sent to clients directly

## Testing with a Developer Account

For testing, you can use the Xero demo company:

1. Log in to your Xero account
2. Go to "Demo Company" to access a pre-populated test environment
3. Use this environment for testing the integration without affecting real financial data

## Troubleshooting

If you encounter issues with your Xero integration:

1. Check the environment variables are correctly set
2. Verify your redirect URI matches exactly what's registered in the Xero developer portal
3. Ensure your Xero developer account has the necessary permissions
4. Check your application logs for specific error messages

## Usage Notes for Testing

When testing with a development account:

1. The Tenant ID might not be automatically retrieved or stored securely
2. You may need to reconnect to Xero periodically as tokens expire
3. Make sure to test with the demo company to avoid creating real invoices

## Security Considerations

- Store the Xero tokens securely in a database (not in memory) for production use
- Implement proper token refresh mechanism for production
- Restrict access to Xero functionality to administrative users only