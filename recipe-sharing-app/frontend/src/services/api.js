import axios from 'axios';

// Base URL of the Express server, from frontend/.env
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

const api = axios.create({ baseURL: `${API_URL}/api` });

// ---------- login token (kept in localStorage) ----------
const TOKEN_KEY = 'recipe-app-token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // storage unavailable (private mode): the user stays logged in until refresh
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

// Attach "Authorization: Bearer <token>" to every request when logged in.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------- helpers ----------

// Uploaded images are stored as "/uploads/x.jpg" and need the server URL in front.
export function imageSrc(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

// Turn any Axios error into a sentence we can show the user.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request && !error?.response) return 'Cannot reach the server. Is the backend running?';
  return fallback;
}

const data = (request) => request.then((response) => response.data);

// ---------- API calls (one function per backend endpoint) ----------

export const authApi = {
  register: (body) => data(api.post('/auth/register', body)),
  login: (body) => data(api.post('/auth/login', body)),
  me: () => data(api.get('/auth/me')),
};

export const recipeApi = {
  list: (params) => data(api.get('/recipes', { params })),
  get: (id) => data(api.get(`/recipes/${id}`)),
  // `body` is FormData (with an image) or a plain object (JSON).
  create: (body) => data(api.post('/recipes', body)),
  update: (id, body) => data(api.put(`/recipes/${id}`, body)),
  remove: (id) => data(api.delete(`/recipes/${id}`)),
  toggleLike: (id) => data(api.post(`/recipes/${id}/like`)),
  toggleSave: (id) => data(api.post(`/recipes/${id}/save`)),
  saved: () => data(api.get('/recipes/saved')),
};

export const aiApi = {
  suggest: (body) => data(api.post('/ai/recipe-suggestions', body)),
};
