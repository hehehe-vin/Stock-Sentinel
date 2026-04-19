import API from './api';

export const watchlistService = {
  getWatchlist: () => API.get('/watchlist'),
  addToWatchlist: (symbol, alertThresholdHigh, alertThresholdLow) => 
    API.post('/watchlist', { symbol, alertThresholdHigh, alertThresholdLow }),
  updateThresholds: (symbol, alertThresholdHigh, alertThresholdLow) => 
    API.put(`/watchlist/${symbol}`, { symbol, alertThresholdHigh, alertThresholdLow }),
  removeFromWatchlist: (symbol) => API.delete(`/watchlist/${symbol}`)
};
