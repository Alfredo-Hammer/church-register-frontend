import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  registerChurch: async (data) => {
    const response = await api.post('/auth/register-church', data);
    return response.data;
  },
};

// Servicios de miembros
export const membersService = {
  getAll: async (params) => {
    const response = await api.get('/members', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/members/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/members', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/members/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/members/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/members/stats');
    return response.data;
  },

  getGroups: async (id) => {
    const response = await api.get(`/members/${id}/groups`);
    return response.data;
  },

  uploadPhoto: async (id, photoBase64) => {
    const response = await api.put(`/members/${id}/photo`, { photoBase64 });
    return response.data;
  },

  deletePhoto: async (id) => {
    const response = await api.delete(`/members/${id}/photo`);
    return response.data;
  },
};

// Servicios de familias
export const familiesService = {
  getAll: async (params) => {
    const response = await api.get('/families', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/families/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/families', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/families/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/families/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/families/stats');
    return response.data;
  },

  addMember: async (familyId, data) => {
    const response = await api.post(`/families/${familyId}/members`, data);
    return response.data;
  },

  removeMember: async (familyId, memberId) => {
    const response = await api.delete(`/families/${familyId}/members/${memberId}`);
    return response.data;
  },

  updateMemberRelationship: async (familyId, memberId, data) => {
    const response = await api.put(`/families/${familyId}/members/${memberId}`, data);
    return response.data;
  },
};

// Servicios de grupos
export const groupsService = {
  getAll: async (params) => {
    const response = await api.get('/groups', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/groups/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/groups', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/groups/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/groups/${id}`);
    return response.data;
  },

  addMember: async (groupId, memberId) => {
    const response = await api.post(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },

  removeMember: async (groupId, memberId) => {
    const response = await api.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/groups/stats');
    return response.data;
  },
};

// Servicios de eventos
export const eventsService = {
  getAll: async (params) => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/events', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  // Asistencia
  getAttendance: async (eventId) => {
    const response = await api.get(`/events/${eventId}/attendance`);
    return response.data;
  },

  recordAttendance: async (eventId, memberId) => {
    const response = await api.post(`/events/${eventId}/attendance`, { memberId });
    return response.data;
  },

  recordBulkAttendance: async (eventId, memberIds) => {
    const response = await api.post(`/events/${eventId}/attendance/bulk`, { memberIds });
    return response.data;
  },

  deleteAttendance: async (eventId, attendanceId) => {
    const response = await api.delete(`/events/${eventId}/attendance/${attendanceId}`);
    return response.data;
  },

  updateGuestCount: async (eventId, guestCount) => {
    const response = await api.put(`/events/${eventId}/guest-count`, { guestCount });
    return response.data;
  },
};

// Servicios de finanzas
export const financesService = {
  // Resumen financiero
  getSummary: async (params) => {
    const response = await api.get('/finances/summary', { params });
    return response.data;
  },

  getMonthly: async (params = {}) => {
    const response = await api.get('/finances/monthly', { params });
    return response.data;
  },

  // Transacciones
  getTransactions: async (params) => {
    const response = await api.get('/finances/transactions', { params });
    return response.data;
  },

  getTransactionById: async (id) => {
    const response = await api.get(`/finances/transactions/${id}`);
    return response.data;
  },

  createTransaction: async (data) => {
    const response = await api.post('/finances/transactions', data);
    return response.data;
  },

  updateTransaction: async (id, data) => {
    const response = await api.put(`/finances/transactions/${id}`, data);
    return response.data;
  },

  deleteTransaction: async (id) => {
    const response = await api.delete(`/finances/transactions/${id}`);
    return response.data;
  },

  // Categorías
  getAllCategories: async (params) => {
    const response = await api.get('/finances/categories', { params });
    return response.data;
  },

  getCategoryById: async (id) => {
    const response = await api.get(`/finances/categories/${id}`);
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post('/finances/categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await api.put(`/finances/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/finances/categories/${id}`);
    return response.data;
  },
};

// ============================================
// DONATIONS SERVICE
// ============================================
export const donationsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/donations', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/donations', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/donations/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/donations/${id}`);
    return response.data;
  },
  getSummary: async (params = {}) => {
    const response = await api.get('/donations/summary', { params });
    return response.data;
  },
};

// ============================================
// BAPTISMS SERVICE
// ============================================
export const baptismsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/baptisms', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/baptisms/${id}`);
    return response.data;
  },
  getByMemberId: async (memberId) => {
    const response = await api.get(`/baptisms/member/${memberId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/baptisms', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/baptisms/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/baptisms/${id}`);
    return response.data;
  },
  getStats: async (params = {}) => {
    const response = await api.get('/baptisms/stats', { params });
    return response.data;
  },
};

// ============================================
// SETTINGS SERVICE
// ============================================
export const settingsService = {
  // Iglesia
  getChurch: async () => {
    const response = await api.get('/settings/church');
    return response.data;
  },
  updateChurch: async (data) => {
    const response = await api.put('/settings/church', data);
    return response.data;
  },

  // Perfil propio
  getProfile: async () => {
    const response = await api.get('/settings/profile');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/settings/profile', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await api.put('/settings/password', data);
    return response.data;
  },

  // Logo de la iglesia
  uploadLogo: async (logoBase64) => {
    const response = await api.put('/settings/church/logo', { logoBase64 });
    return response.data;
  },
  deleteLogo: async () => {
    const response = await api.delete('/settings/church/logo');
    return response.data;
  },

  // Usuarios (ADMIN)
  getUsers: async () => {
    const response = await api.get('/settings/users');
    return response.data;
  },
  createUser: async (data) => {
    const response = await api.post('/settings/users', data);
    return response.data;
  },
  updateUser: async (id, data) => {
    const response = await api.put(`/settings/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/settings/users/${id}`);
    return response.data;
  },
};

// ============================================
// PROGRAMS SERVICE
// ============================================
export const programsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/programs', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/programs/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/programs', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/programs/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/programs/${id}`);
    return response.data;
  },
  addItem: async (programId, data) => {
    const response = await api.post(`/programs/${programId}/items`, data);
    return response.data;
  },
  updateItem: async (programId, itemId, data) => {
    const response = await api.put(`/programs/${programId}/items/${itemId}`, data);
    return response.data;
  },
  deleteItem: async (programId, itemId) => {
    const response = await api.delete(`/programs/${programId}/items/${itemId}`);
    return response.data;
  },
  reorderItems: async (programId, itemIds) => {
    const response = await api.put(`/programs/${programId}/items/reorder`, { itemIds });
    return response.data;
  },
  reorderItem: async (programId, itemId, direction) => {
    const response = await api.patch(`/programs/${programId}/items/${itemId}/reorder`, { direction });
    return response.data;
  },
};

// ============================================
// VISITORS SERVICE
// ============================================
export const visitorsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/visitors', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/visitors/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/visitors', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/visitors/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/visitors/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/visitors/stats');
    return response.data;
  },
  getFollowUps: async (visitorId) => {
    const response = await api.get(`/visitors/${visitorId}/follow-ups`);
    return response.data;
  },
  addFollowUp: async (visitorId, data) => {
    const response = await api.post(`/visitors/${visitorId}/follow-ups`, data);
    return response.data;
  },
  deleteFollowUp: async (visitorId, followUpId) => {
    const response = await api.delete(`/visitors/${visitorId}/follow-ups/${followUpId}`);
    return response.data;
  },
};

// ============================================
// ACTIVITIES SERVICE
// ============================================
export const activitiesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/activities', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/activities/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/activities', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/activities/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/activities/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/activities/stats');
    return response.data;
  },
};

// ============================================
// LEADERS SERVICE
// ============================================
export const leadersService = {
  getAll: async (params = {}) => {
    const response = await api.get('/leaders', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/leaders/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/leaders', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/leaders/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/leaders/${id}`);
    return response.data;
  },
};

// ============================================
// COMMUNION SERVICE
// ============================================
export const communionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/communion', { params });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/communion/stats');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/communion/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/communion', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/communion/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/communion/${id}`);
    return response.data;
  },
  addBulkParticipants: async (id, memberIds) => {
    const response = await api.post(`/communion/${id}/participants/bulk`, { memberIds });
    return response.data;
  },
  removeParticipant: async (id, participantId) => {
    const response = await api.delete(`/communion/${id}/participants/${participantId}`);
    return response.data;
  },
  updateGuestCount: async (id, guestCount) => {
    const response = await api.put(`/communion/${id}/guest-count`, { guestCount });
    return response.data;
  },
};

export default api;
