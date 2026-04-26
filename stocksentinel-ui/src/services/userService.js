import API from './api';

export const userService = {
  getPreferences: () => API.get('/user/preferences'),
  updatePreferences: (preferences) => API.put('/user/preferences', preferences),
};
