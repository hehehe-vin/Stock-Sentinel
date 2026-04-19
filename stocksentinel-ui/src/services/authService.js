import API from './api';

export const authService = {
  register: (name, email, password) => API.post('/auth/register', { name, email, password }),
  login: (email, password) => API.post('/auth/login', { email, password }),
};
