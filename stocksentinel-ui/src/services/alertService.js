import API from './api';

export const alertService = {
  getMyAlerts: () => API.get('/alerts/my'),
};
