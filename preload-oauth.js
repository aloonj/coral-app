#!/usr/bin/env node

/**
 * OAuth Route Preloader
 * 
 * This script preloads the OAuth routes in your Express app by sending periodic
 * warmup requests. This ensures the routes are ready when actual user requests arrive.
 * 
 * Usage:
 * 1. Save this file to your project directory
 * 2. Make it executable: chmod +x preload-oauth.js
 * 3. Run it in the background: node preload-oauth.js &
 * 
 * It will send warmup requests every 30 seconds to keep routes active.
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'https://dev.fragglerock.shop/api',
  localPort: 5001, // Your local Express app port
  interval: 30000, // 30 seconds
  routes: [
    '/auth/google',
    '/auth/google/callback'
  ]
};

console.log('🔥 OAuth Route Preloader');
console.log(`🌐 Target API: ${CONFIG.apiUrl}`);
console.log(`⏱️  Interval: ${CONFIG.interval / 1000} seconds`);
console.log('📋 Routes to preload:');
CONFIG.routes.forEach(route => console.log(`   - ${route}`));

// Function to send a request to the route
function preloadRoute(route) {
  // Send request to both the public URL and local port
  preloadPublicRoute(route);
  preloadLocalRoute(route);
}

// Preload public-facing route
function preloadPublicRoute(route) {
  const url = `${CONFIG.apiUrl}${route}?preload=true&t=${Date.now()}`;
  console.log(`📤 Preloading public route: ${url}`);
  
  https.get(url, (res) => {
    console.log(`📥 Response for ${route}: Status ${res.statusCode}`);
    // We don't care about the response body
    res.resume();
  }).on('error', (err) => {
    console.error(`❌ Error preloading ${route}: ${err.message}`);
  });
}

// Preload local route directly to bypass Nginx
function preloadLocalRoute(route) {
  const localUrl = `http://localhost:${CONFIG.localPort}${route}?preload=true&local=true&t=${Date.now()}`;
  console.log(`📤 Preloading local route: ${localUrl}`);
  
  http.get(localUrl, (res) => {
    console.log(`📥 Local response for ${route}: Status ${res.statusCode}`);
    // We don't care about the response body
    res.resume();
  }).on('error', (err) => {
    console.error(`❌ Error preloading local ${route}: ${err.message}`);
  });
}

// Schedule preloading of all routes
function schedulePreloads() {
  CONFIG.routes.forEach(route => {
    // Initial preload
    preloadRoute(route);
    
    // Schedule regular preloads
    setInterval(() => {
      preloadRoute(route);
    }, CONFIG.interval);
  });
}

// Start preloading
schedulePreloads();
console.log('✅ Preloader running...');
