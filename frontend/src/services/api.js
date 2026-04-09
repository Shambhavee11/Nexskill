import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        const response = await axios.post(`${API_BASE}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─── AUTH ─────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  resendOTP: (userId) => api.post('/auth/resend-otp', { userId }),
};

// ─── USERS ────────────────────────────────────────────────────
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  getUser: (userId) => api.get(`/users/${userId}`),
  explore: (params) => api.get('/users/explore', { params }),
  addSkill: (data) => api.post('/users/me/skills', data),
  deleteSkill: (skillId) => api.delete(`/users/me/skills/${skillId}`),
  getCreditHistory: () => api.get('/users/me/credits'),
  addPortfolioItem: (data) => api.post('/users/me/portfolio', data),
  deletePortfolioItem: (id) => api.delete(`/users/me/portfolio/${id}`),
};

// ─── REQUESTS ─────────────────────────────────────────────────
export const requestsAPI = {
  create: (data) => api.post('/requests', data),
  getAll: (params) => api.get('/requests', { params }),
  accept: (requestId) => api.put(`/requests/${requestId}/accept`),
  complete: (requestId) => api.put(`/requests/${requestId}/complete`),
  review: (requestId, data) => api.post(`/requests/${requestId}/review`, data),
};

// ─── MESSAGES / CHAT ──────────────────────────────────────────
export const messagesAPI = {
  startConversation: (userId) =>
    api.post('/chat/conversations', { participantId: userId }),

  getConversations: () =>
    api.get('/chat/conversations'),

  getMessages: (conversationId) =>
    api.get(`/chat/conversations/${conversationId}/messages`),

  sendMessage: (conversationId, data) =>
    api.post(`/chat/conversations/${conversationId}/messages`, data),

  createOrGetConversation: (participantId) =>
    api.post('/chat/conversations', { participantId }),
};

// Optional alias if some files still import chatAPI
export const chatAPI = messagesAPI;

// ─── NOTIFICATIONS ────────────────────────────────────────────
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
};

export default api;