import API from './api';

export const stockService = {
  getAllStocks: () => API.get('/stocks'),
  getStockBySymbol: (symbol) => API.get(`/stocks/${symbol}`),
  getAllSymbols: () => API.get('/stocks/symbols'),
  uploadCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/stocks/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getStocksByRange: (symbol, start, end) => API.get(`/stocks/${symbol}/range`, { params: { start, end } })
};
