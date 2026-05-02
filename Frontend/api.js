// ── API Service ──────────────────────────────────────────────
const API_BASE = 'https://teamtaskmanager-production-8c1f.up.railway.app/api';

const api = {
  token: null,

  setToken(t) { this.token = t; localStorage.setItem('tf_token', t); },
  clearToken() { this.token = null; localStorage.removeItem('tf_token'); },
  loadToken() { this.token = localStorage.getItem('tf_token'); return this.token; },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.errors?.[0]?.msg || 'Request failed');
    return data;
  },

  get(path)          { return this.request('GET', path); },
  post(path, body)   { return this.request('POST', path, body); },
  put(path, body)    { return this.request('PUT', path, body); },
  delete(path)       { return this.request('DELETE', path); },

  // Auth
  signup: (d)        => api.post('/auth/signup', d),
  login:  (d)        => api.post('/auth/login', d),
  getMe:  ()         => api.get('/auth/me'),

  // Projects
  getProjects:        ()        => api.get('/projects'),
  createProject:      (d)       => api.post('/projects', d),
  getProject:         (id)      => api.get(`/projects/${id}`),
  updateProject:      (id, d)   => api.put(`/projects/${id}`, d),
  deleteProject:      (id)      => api.delete(`/projects/${id}`),
  addMember:          (id, d)   => api.post(`/projects/${id}/members`, d),
  removeMember:       (id, uid) => api.delete(`/projects/${id}/members/${uid}`),
  updateMemberRole:   (id, uid, role) => api.put(`/projects/${id}/members/${uid}/role`, { role }),

  // Tasks
  getTasks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/tasks${qs ? '?' + qs : ''}`);
  },
  getDashboard: ()        => api.get('/tasks/dashboard'),
  getTask:      (id)      => api.get(`/tasks/${id}`),
  createTask:   (d)       => api.post('/tasks', d),
  updateTask:   (id, d)   => api.put(`/tasks/${id}`, d),
  deleteTask:   (id)      => api.delete(`/tasks/${id}`),
  addComment:   (id, text) => api.post(`/tasks/${id}/comments`, { text }),

  // Users
  searchUsers: (email) => api.get(`/users/search?email=${encodeURIComponent(email)}`),
};