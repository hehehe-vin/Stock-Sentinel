import API from './api';

export const alertService = {
  getAllAlerts: () => API.get('/alerts'),
  getAlertsBySymbol: (symbol) => API.get(`/alerts/${symbol}`),
  getMyAlerts: () => API.get('/alerts/my')
};
