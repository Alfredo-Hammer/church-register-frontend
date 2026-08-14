import axios from 'axios';

// Sin VITE_API_URL (dev normal) usamos una ruta relativa: así la petición
// sale hacia el mismo origen que sirvió la página — sea localhost o la IP
// de la red local desde el celular — y el proxy de Vite ('/api' →
// localhost:3000, en vite.config.js) la reenvía al backend. Un
// 'http://localhost:3000' fijo aquí "funciona" en la máquina de desarrollo
// de pura casualidad (su propio localhost sí es el backend), pero en
// cualquier otro dispositivo — como el celular probando en red local —
// localhost apunta al dispositivo mismo, no al backend.
const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    // No cerrar sesión cuando lo que falló fue una reconfirmación de
    // contraseña (step-up auth): la sesión sigue válida y el error lo maneja
    // el propio formulario.
    const stepUpFailure = error.response?.data?.authorizationFailed;
    if (error.response?.status === 401 && !stepUpFailure) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // Cuenta desactivada por un admin mientras la sesión seguía abierta: el
    // JWT no se puede revocar, así que esto es lo que realmente la corta.
    // El intento de /auth/login con la cuenta ya desactivada NO pasa por
    // aquí: ese 403 lo debe mostrar el propio formulario de login, no un
    // reload que se lo lleve antes de que se alcance a leer.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'ACCOUNT_DISABLED' &&
      !isLoginRequest
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('loginNotice', 'Tu cuenta ha sido desactivada. Contacta a un administrador.');
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

  requestEmailVerification: async (email) => {
    const response = await api.post('/auth/request-email-verification', { email });
    return response.data;
  },

  verifyEmail: async (token, email) => {
    const response = await api.post('/auth/verify-email', { token, email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, email, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, email, newPassword });
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

  getBirthdays: async (month) => {
    const response = await api.get('/members/birthdays', { params: { month } });
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

  // ── Líderes del grupo
  getLeaders: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/leaders`);
    return response.data;
  },
  addLeader: async (groupId, data) => {
    const response = await api.post(`/groups/${groupId}/leaders`, data);
    return response.data;
  },
  removeLeader: async (groupId, leaderId) => {
    const response = await api.delete(`/groups/${groupId}/leaders/${leaderId}`);
    return response.data;
  },

  // ── Actividades del grupo
  getActivities: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/activities`);
    return response.data;
  },
  addActivity: async (groupId, data) => {
    const response = await api.post(`/groups/${groupId}/activities`, data);
    return response.data;
  },
  deleteActivity: async (groupId, activityId) => {
    const response = await api.delete(`/groups/${groupId}/activities/${activityId}`);
    return response.data;
  },

  // ── Finanzas del grupo
  getFinances: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/finances`);
    return response.data;
  },
  addTransaction: async (groupId, data) => {
    const response = await api.post(`/groups/${groupId}/finances`, data);
    return response.data;
  },
  deleteTransaction: async (groupId, transactionId) => {
    const response = await api.delete(`/groups/${groupId}/finances/${transactionId}`);
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

  getStats: async (params = {}) => {
    const response = await api.get('/events/stats', { params });
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
  uploadProfilePhoto: async (photoBase64) => {
    const response = await api.put('/settings/profile/photo', { photoBase64 });
    return response.data;
  },
  deleteProfilePhoto: async () => {
    const response = await api.delete('/settings/profile/photo');
    return response.data;
  },

  // Código de invitación (acceso de miembros por la app móvil)
  getJoinCode: async () => {
    const response = await api.get('/settings/join-code');
    return response.data;
  },
  regenerateJoinCode: async () => {
    const response = await api.put('/settings/join-code/regenerate');
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
  getUsers: async (params = {}) => {
    const response = await api.get('/settings/users', {params});
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
  toggleUserActive: async (id) => {
    const response = await api.patch(`/settings/users/${id}/toggle`);
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
  getBirthdays: async (month) => {
    const response = await api.get('/visitors/birthdays', { params: { month } });
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
  convertToMember: async (visitorId) => {
    const response = await api.post(`/visitors/${visitorId}/convert-to-member`);
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

// ============================================
// PRAYER DAYS SERVICE
// ============================================
export const prayerService = {
  getAll: async (params) => {
    const response = await api.get('/prayer', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/prayer/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/prayer', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/prayer/${id}`, data);
    return response.data;
  },

  toggleActive: async (id) => {
    const response = await api.patch(`/prayer/${id}/toggle`);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/prayer/${id}`);
    return response.data;
  },

  getAttendance: async (id, date) => {
    const response = await api.get(`/prayer/${id}/attendance`, { params: { date } });
    return response.data;
  },

  saveAttendance: async (id, date, memberIds, guestCount = 0) => {
    const response = await api.post(`/prayer/${id}/attendance`, { date, memberIds, guestCount });
    return response.data;
  },

  getAttendanceHistory: async (id, limit = 10) => {
    const response = await api.get(`/prayer/${id}/attendance/history`, { params: { limit } });
    return response.data;
  },

  getReports: async (startDate, endDate) => {
    const response = await api.get('/prayer/reports', { params: { startDate, endDate } });
    return response.data;
  },
};

// ============================================
// SEARCH SERVICE
// ============================================
export const searchService = {
  search: async (q, limit = 5) => {
    const response = await api.get('/search', { params: { q, limit } });
    return response.data;
  },
};

// ============================================
// LETTERS SERVICE (Cartas de Referencia)
// ============================================
export const lettersService = {
  getAll: async (params = {}) => {
    const response = await api.get('/letters', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/letters/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/letters', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/letters/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/letters/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/letters/stats');
    return response.data;
  },
};

// ============================================
// CONFERENCE SERVICE
// ============================================
export const conferenceService = {
  // ── Conferencias ──────────────────────────
  getAll: async () => {
    const response = await api.get('/conference');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/conference/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/conference', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/conference/${id}`, data);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/conference/${id}/status`, { status });
    return response.data;
  },
  regenerateRegistrationToken: async (id) => {
    const response = await api.put(`/conference/${id}/registration-token/regenerate`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/conference/${id}`);
    return response.data;
  },

  // ── Tipos de sesión (catálogo por iglesia) ─
  getSessionTypes: async () => {
    const response = await api.get('/conference/session-types');
    return response.data;
  },
  createSessionType: async (data) => {
    const response = await api.post('/conference/session-types', data);
    return response.data;
  },
  updateSessionType: async (id, data) => {
    const response = await api.put(`/conference/session-types/${id}`, data);
    return response.data;
  },
  deleteSessionType: async (id) => {
    const response = await api.delete(`/conference/session-types/${id}`);
    return response.data;
  },

  // ── Iglesias participantes (catálogo por iglesia) ─
  getParticipatingChurches: async () => {
    const response = await api.get('/conference/participating-churches');
    return response.data;
  },
  createParticipatingChurch: async (name) => {
    const response = await api.post('/conference/participating-churches', { name });
    return response.data;
  },
  deleteParticipatingChurch: async (id) => {
    const response = await api.delete(`/conference/participating-churches/${id}`);
    return response.data;
  },

  // ── Oradores (catálogo por iglesia) ─
  getSpeakers: async () => {
    const response = await api.get('/conference/speakers');
    return response.data;
  },
  createSpeaker: async (data) => {
    const response = await api.post('/conference/speakers', data);
    return response.data;
  },
  deleteSpeaker: async (id) => {
    const response = await api.delete(`/conference/speakers/${id}`);
    return response.data;
  },

  // ── Días ──────────────────────────────────
  addDay: async (conferenceId, data) => {
    const response = await api.post(`/conference/${conferenceId}/days`, data);
    return response.data;
  },
  deleteDay: async (conferenceId, dayId) => {
    const response = await api.delete(`/conference/${conferenceId}/days/${dayId}`);
    return response.data;
  },

  // ── Sesiones ──────────────────────────────
  addSession: async (dayId, data) => {
    const response = await api.post(`/conference/days/${dayId}/sessions`, data);
    return response.data;
  },
  updateSession: async (sessionId, data) => {
    const response = await api.put(`/conference/sessions/${sessionId}`, data);
    return response.data;
  },
  updateSessionStatus: async (sessionId, status) => {
    const response = await api.put(`/conference/sessions/${sessionId}/status`, { status });
    return response.data;
  },
  deleteSession: async (sessionId) => {
    const response = await api.delete(`/conference/sessions/${sessionId}`);
    return response.data;
  },

  // ── Registros de asistentes ────────────────
  getRegistrations: async (conferenceId, params = {}) => {
    const response = await api.get(`/conference/${conferenceId}/registrations`, { params });
    return response.data;
  },
  getStats: async (conferenceId) => {
    const response = await api.get(`/conference/${conferenceId}/stats`);
    return response.data;
  },
  createRegistration: async (conferenceId, data) => {
    const response = await api.post(`/conference/${conferenceId}/registrations`, data);
    return response.data;
  },
  updateRegistration: async (conferenceId, regId, data) => {
    const response = await api.put(`/conference/${conferenceId}/registrations/${regId}`, data);
    return response.data;
  },
  deleteRegistration: async (conferenceId, regId) => {
    const response = await api.delete(`/conference/${conferenceId}/registrations/${regId}`);
    return response.data;
  },

  // ── Asistencia por sesión (gafetes) ────────
  checkIn: async (checkInToken, sessionId) => {
    const response = await api.post('/conference/check-in', { checkInToken, sessionId });
    return response.data;
  },
  getSessionAttendance: async (sessionId) => {
    const response = await api.get(`/conference/sessions/${sessionId}/attendance`);
    return response.data;
  },
  getRegistrationAttendance: async (regId) => {
    const response = await api.get(`/conference/registrations/${regId}/attendance`);
    return response.data;
  },
  markAttendance: async (sessionId, regId, status = 'PRESENTE') => {
    const response = await api.post(`/conference/sessions/${sessionId}/attendance/${regId}`, { status });
    return response.data;
  },
  unmarkAttendance: async (sessionId, regId) => {
    const response = await api.delete(`/conference/sessions/${sessionId}/attendance/${regId}`);
    return response.data;
  },
  getAttendanceReport: async (conferenceId) => {
    const response = await api.get(`/conference/${conferenceId}/attendance-report`);
    return response.data;
  },
};

// ============================================
// ANNOUNCEMENTS SERVICE
// ============================================
export const announcementsService = {
  getAll: async () => {
    const response = await api.get('/announcements');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/announcements', data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/announcements/${id}`);
    return response.data;
  },
};

export default api;
