import API from './api';

export const datasourceService = {
  getStatus: () => API.get('/datasource/status'),
  getWatchedSymbols: () => API.get('/datasource/symbols'),
  triggerPoll: () => API.post('/datasource/poll')
};
