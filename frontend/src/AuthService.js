import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  async (config) => {
    if (!isTokenExpired()) {
      const token = localStorage.getItem('access');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      const refreshed = await refreshToken();
      if (refreshed) {
        config.headers.Authorization = `Bearer ${localStorage.getItem('access')}`;
      } else {
        logout();
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      refreshToken().catch(() => {
        logout();
      });
    }
    return Promise.reject(error);
  }
);

const isTokenExpired = () => {
  const token = localStorage.getItem('access');
  if (!token) return true;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh');
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await axios.post(`${API_URL}/token/refresh/`, {
      refresh: refreshToken
    });
    
    localStorage.setItem('access', response.data.access);
    localStorage.setItem('refresh', response.data.refresh);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

const logout = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('username');
  window.location.href = '/login';
};

const checkAuth = async () => {
  if (isTokenExpired()) {
    try {
      const success = await refreshToken();
      return success;
    } catch (error) {
      logout();
      return false;
    }
  }
  return true;
};

export { api, isTokenExpired, refreshToken, logout, checkAuth };