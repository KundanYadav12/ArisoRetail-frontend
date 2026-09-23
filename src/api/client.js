import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: `${baseURL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ariso_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token expiry handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname.startsWith('/superadmin') && window.location.pathname !== '/superadmin/login') {
        localStorage.removeItem('ariso_admin_token');
        localStorage.removeItem('ariso_admin_user');
        window.location.href = '/superadmin/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// ================= PUBLIC API =================
export const publicAPI = {
  getSettings: () => apiClient.get('/public/settings'),
  getProducts: () => apiClient.get('/public/products'),
  getTestimonials: () => apiClient.get('/public/testimonials'),
  submitEnquiry: (data) => apiClient.post('/public/enquiries', data),
};

// ================= AUTH API =================
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  getMe: () => apiClient.get('/auth/me'),
  changePassword: (payload) => apiClient.post('/auth/change-password', payload),
};

// ================= ADMIN API =================
export const adminAPI = {
  getStats: () => apiClient.get('/admin/stats'),
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (settings) => apiClient.put('/admin/settings', { settings }),
  
  // Products
  getProducts: () => apiClient.get('/admin/products'),
  getProduct: (id) => apiClient.get(`/admin/products/${id}`),
  createProduct: (data) => apiClient.post('/admin/products', data),
  updateProduct: (id, data) => apiClient.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/admin/products/${id}`),

  // Testimonials
  getTestimonials: () => apiClient.get('/admin/testimonials'),
  createTestimonial: (data) => apiClient.post('/admin/testimonials', data),
  updateTestimonial: (id, data) => apiClient.put(`/admin/testimonials/${id}`, data),
  deleteTestimonial: (id) => apiClient.delete(`/admin/testimonials/${id}`),

  // Enquiries
  getEnquiries: (status) => apiClient.get('/admin/enquiries', { params: { status } }),
  updateEnquiryStatus: (id, status) => apiClient.put(`/admin/enquiries/${id}/status`, { status }),
  deleteEnquiry: (id) => apiClient.delete(`/admin/enquiries/${id}`),

  // Media
  getMedia: () => apiClient.get('/admin/media'),
  uploadMedia: (formData) => apiClient.post('/admin/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteMedia: (id) => apiClient.delete(`/admin/media/${id}`),
};
