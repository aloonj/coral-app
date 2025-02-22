export const config = {
  siteName: import.meta.env.VITE_APP_NAME || 'FraggleRock',
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || '£',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
}
