import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

export const API_URL = import.meta.env.VITE_API_URL;
export const BASE_URL = import.meta.env.VITE_BASE_URL;

// Debug log to check what API URL is being used
console.log('API URL:', API_URL);
console.log('Environment variables:', import.meta.env);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't remove token for password change attempts
    if (error.response?.status === 401 && !error.config.url.includes('/auth/change-password')) {
      tokenStorage.removeToken();
    }
    return Promise.reject(error);
  }
);

export const coralService = {
  getAllCorals: () => api.get('/corals'),
  getCorals: (params = {}) => api.get('/corals', { params }),
  getCoral: (id) => api.get(`/corals/${id}`),
  createCoral: (data) => {
    // If data is already FormData, use it directly
    if (data instanceof FormData) {
      return api.post('/corals', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // Otherwise, create FormData from object
    const formData = new FormData();
    // Handle file upload if present
    if (data.image) {
      formData.append('image', data.image);
      delete data.image;
    }
    // Add rest of the data
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    return api.post('/corals', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateCoral: (id, data) => {
    // If data is already FormData, use it directly
    if (data instanceof FormData) {
      return api.put(`/corals/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    // Otherwise, create FormData from object
    const formData = new FormData();
    // Handle file upload if present
    if (data.image) {
      formData.append('image', data.image);
      delete data.image;
    }
    // Add rest of the data
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    return api.put(`/corals/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteCoral: (id) => api.delete(`/corals/${id}`),
};

export const imageService = {
  getAllImages: () => api.get('/images'),
  deleteImage: (category, filename) => api.delete(`/images/${category}/${filename}`),
  uncategorizeImage: (category, filename) => api.post(`/images/${category}/${filename}/uncategorize`, {}),
  categorizeImage: (category, filename, targetCategory) => 
    api.post(`/images/${category}/${filename}/categorize`, { targetCategory }),
  uploadImages: (files, category) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });
    if (category) {
      formData.append('category', category);
    }
    return api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // TEMPORARY: Fix uncategorized images that are in use by corals
  fixUncategorizedImages: () => api.post('/images/fix-uncategorized', {}, {
    headers: {
      'Content-Type': 'application/json',
    },
  }),
};

export const categoryService = {
  getAllCategories: (includeInactive = false) => 
    api.get('/categories', { params: { includeInactive } }),
  getCategory: (id) => api.get(`/categories/${id}`),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  restoreCategory: (id) => api.post(`/categories/${id}/restore`, {}),
};

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      tokenStorage.setToken(response.data.token);
      // Return both token and user data for AuthContext
      return {
        ...response,
        data: {
          ...response.data,
          token: response.data.token // Ensure token is included in response data
        }
      };
    }
    return response;
  },
  register: (userData) => api.post('/auth/client-register', userData),
  logout: () => {
    tokenStorage.removeToken();
  },
  getClientProfile: () => api.get('/auth/client-profile'),
  updateClientProfile: (data) => api.put('/auth/client-profile', data),
};

export const orderService = {
  getAllOrders: (includeArchived = true) => api.get('/orders', { params: { includeArchived } }),
  getOrder: (id) => api.get(`/orders/${id}`),
  getMyOrders: (includeArchived = true) => api.get('/orders/my-orders', { params: { includeArchived } }),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => {
    if (data.archived !== undefined) {
      return api.put(`/orders/${id}/archive`, data);
    }
    if (data.status !== undefined) {
      return api.put(`/orders/${id}/status`, data);
    }
    return api.put(`/orders/${id}`, data);
  },
  markOrderAsInvoiced: (id) => api.put(`/orders/${id}/invoice`, {}),
  resetOrderInvoiceStatus: (id) => api.put(`/orders/${id}/reset-invoice`, {}),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  purgeArchivedOrders: () => api.delete('/orders/purge/archived'),
};

export const bulletinService = {
  getAllBulletins: () => api.get('/bulletins'),
  getBulletin: (id) => api.get(`/bulletins/${id}`),
  createBulletin: (data) => api.post('/bulletins', data),
  updateBulletin: (id, data) => api.put(`/bulletins/${id}`, data),
  deleteBulletin: (id) => api.delete(`/bulletins/${id}`),
};

export const clientService = {
  getAllClients: () => api.get('/clients'),
  getClient: (id) => api.get(`/clients/${id}`),
  getClientProfile: () => api.get('/clients/profile'),
  createClient: (data) => api.post('/clients', data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  approveClient: (id) => api.post(`/clients/${id}/approve`, {}),
  getPendingApprovalsCount: () => api.get('/clients/pending-approvals/count'),
  getPendingRegistrationsCount: () => api.get('/clients/pending-registrations/count'),
};

export const notificationService = {
  getQueueStatus: () => api.get('/notifications/queue/status'),
  retryNotifications: (ids) => api.post('/notifications/queue/retry', { ids }),
  cleanupNotifications: (days) => api.delete(`/notifications/queue/cleanup?days=${days}`),
  deleteAllNotifications: () => api.delete('/notifications/queue/all'),
  sendTestNotification: () => api.post('/notifications/test', {}),
};

export const backupService = {
  getAllBackups: () => api.get('/backups'),
  getBackupConfig: () => api.get('/backups/config'),
  createBackup: () => api.post('/backups', { type: 'database' }),
  downloadBackup: (id) => api.get(`/backups/${id}/download`, { responseType: 'blob' }),
  deleteBackup: (id) => api.delete(`/backups/${id}`),
};

export const xeroService = {
  getStatus: () => api.get('/xero/status'),
  startAuth: (forceNew = false) => api.get(`/xero/auth${forceNew ? '?forceNew=true' : ''}`),
  handleCallback: (url) => api.post('/xero/callback', { url }),
  generateInvoice: (orderId, sendToClient = false) => 
    api.post(`/xero/invoices/order/${orderId}`, { sendToClient }),
  sendInvoice: (invoiceId) => api.post(`/xero/invoices/${invoiceId}/send`),
  getInvoices: () => api.get('/xero/invoices'),
  generateTestInvoice: (testData) => api.post('/xero/invoices/test', testData),
  disconnect: () => api.post('/xero/disconnect', {}),
};

export default api;
