import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Default allowed hosts that work for all environments
  const defaultAllowedHosts = ['dev.fragglerock.shop', 'localhost', '127.0.0.1']
  
  // Add custom hosts from environment variable if defined
  const customHosts = env.ALLOWED_HOSTS ? env.ALLOWED_HOSTS.split(',') : []
  const allowedHosts = [...defaultAllowedHosts, ...customHosts]
  
  return {
    plugins: [react()],
    preview: {
      port: 3000,
      host: true,
      allowedHosts
    },
    server: {
      port: 3000,
      host: true,
      allowedHosts
    }
  }
})
