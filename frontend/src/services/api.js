import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor: attach access token ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 / token refresh ─────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.data.accessToken}`;
        processQueue(null, data.data.accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── API Helpers ───────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  changePassword: (data) => api.put('/auth/change-password', data),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getOne: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  bulkDelete: (ids) => api.delete('/students/bulk', { data: { ids } }),
  bulkAllocate: (data) => api.put('/students/bulk-allocate', data),
  // Staging
  getStaging: (params) => api.get('/students/staging', { params }),
  approve: (id, data) => api.post(`/students/staging/${id}/approve`, data || {}),
  reject: (id, reason) => api.post(`/students/staging/${id}/reject`, { reason }),
  bulkApprove: (ids) => api.post('/students/staging/bulk-approve', { ids }),
};

export const teachersAPI = {
  getAll: (params) => api.get('/teachers', { params }),
  getOne: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  assignClass: (id, classId) => api.put(`/teachers/${id}/assign-class`, { classId }),
  // Staging
  getStaging: () => api.get('/teachers/staging'),
  approve: (id) => api.post(`/teachers/staging/${id}/approve`),
  reject: (id, reason) => api.post(`/teachers/staging/${id}/reject`, { reason }),
};

export const volunteersAPI = {
  getAll: (params) => api.get('/volunteers', { params }),
  getOne: (id) => api.get(`/volunteers/${id}`),
  create: (data) => api.post('/volunteers', data),
  update: (id, data) => api.put(`/volunteers/${id}`, data),
  delete: (id) => api.delete(`/volunteers/${id}`),
  // Staging
  getStaging: () => api.get('/volunteers/staging'),
  approve: (id) => api.post(`/volunteers/staging/${id}/approve`),
  reject: (id, reason) => api.post(`/volunteers/staging/${id}/reject`, { reason }),
};

export const classesAPI = {
  getAll: (params) => api.get('/classes', { params }),
  getOne: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  getEligibleStudents: (id) => api.get(`/classes/${id}/eligible-students`),
};

export const attendanceAPI = {
  getWindowStatus: () => api.get('/attendance/window-status'),
  getTodaySummary: (params) => api.get('/attendance/today-summary', { params }),
  // Student
  getStudentAttendance: (params) => api.get('/attendance/students', { params }),
  submitStudentAttendance: (data) => api.post('/attendance/students', data),
  modifyStudentAttendance: (id, data) => api.put(`/attendance/students/${id}/modify`, data),
  deleteStudentAttendance: (id) => api.delete(`/attendance/students/${id}`),
  // Teacher
  getTeacherAttendance: (params) => api.get('/attendance/teachers', { params }),
  submitTeacherAttendance: (data) => api.post('/attendance/teachers', data),
  modifyTeacherAttendance: (id, data) => api.put(`/attendance/teachers/${id}/modify`, data),
  deleteTeacherAttendance: (id) => api.delete(`/attendance/teachers/${id}`),
  // Volunteer
  getVolunteerAttendance: (params) => api.get('/attendance/volunteers', { params }),
  submitVolunteerAttendance: (data) => api.post('/attendance/volunteers', data),
  modifyVolunteerAttendance: (id, data) => api.put(`/attendance/volunteers/${id}/modify`, data),
  deleteVolunteerAttendance: (id) => api.delete(`/attendance/volunteers/${id}`),
};

export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getStudentAnalytics: (params) => api.get('/analytics/students', { params }),
  getAttendanceTrends: (params) => api.get('/analytics/attendance-trends', { params }),
  getModifications: (params) => api.get('/analytics/modifications', { params }),
};

export const reportsAPI = {
  getDaily: (params) => api.get('/reports/daily', { params }),
  getFullYear: (params) => api.get('/reports/full-year', { params }),
  getClass: (classId, params) => api.get(`/reports/class/${classId}`, { params }),
  getStudent: (studentId) => api.get(`/reports/student/${studentId}`),
  getTeacher: (teacherId) => api.get(`/reports/teacher/${teacherId}`),
  getVolunteer: (volunteerId) => api.get(`/reports/volunteer/${volunteerId}`),
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getActive: () => api.get('/settings/active'),
  create: (data) => api.post('/settings', data),
  update: (id, data) => api.put(`/settings/${id}`, data),
  activate: (id) => api.put(`/settings/${id}/activate`),
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  broadcast: (data) => api.post('/notifications/broadcast', data),
};
