import API from './api';

export const datasourceService = {
  getStatus: () => API.get('/datasource/status'),
  getWatchedSymbols: () => API.get('/datasource/symbols'),
  triggerPoll: () => API.post('/datasource/poll'),
  getLiveQuotes: () => API.get('/datasource/live-quotes'),
  getCandles: (symbol, resolution = '5', hours = 24) =>
    API.get(`/datasource/candles/${symbol}?resolution=${resolution}&hours=${hours}`),
};
