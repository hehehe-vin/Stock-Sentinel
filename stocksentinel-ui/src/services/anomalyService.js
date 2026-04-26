import API from './api';

export const anomalyService = {
  getAllAnomalies: () => API.get('/anomalies'),
  getAnomaliesBySymbol: (symbol) => API.get(`/anomalies/${symbol}`),
  getAnomaliesBySeverity: (level) => API.get(`/anomalies/severity/${level}`),
  getAnomaliesByDateRange: (start, end) => API.get('/anomalies/range', { params: { start, end } }),
  getAnomalyCount: () => API.get('/anomalies/count'),
  getVolatility: (symbol) => API.get(`/anomalies/volatility/${symbol}`),
  getAllVolatility: () => API.get('/anomalies/volatility'),
  backtestCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/anomalies/backtest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};
