import API from './api';

export const anomalyService = {
  getAllAnomalies: () => API.get('/anomalies'),
  getAnomaliesBySymbol: (symbol) => API.get(`/anomalies/${symbol}`),
  getAnomaliesBySeverity: (level) => API.get(`/anomalies/severity/${level}`),
  getAnomaliesByDateRange: (start, end) => API.get('/anomalies/range', { params: { start, end } }),
  getAnomalyCount: () => API.get('/anomalies/count')
};
