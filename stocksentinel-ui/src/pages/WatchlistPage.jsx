import { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { watchlistService } from '../services/watchlistService';
import { stockService } from '../services/stockService';
import { Plus, Eye, Edit2, Check, X, Trash2 } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function WatchlistPage() {
  const { chartType } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSymbol, setAddSymbol] = useState('');
  const [addHigh, setAddHigh] = useState('');
  const [addLow, setAddLow] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [editingRow, setEditingRow] = useState(null);
  const [editHigh, setEditHigh] = useState('');
  const [editLow, setEditLow] = useState('');

  const [selectedStock, setSelectedStock] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await watchlistService.getWatchlist();
      setWatchlist(res.data);
    } catch (err) {
      console.error('Failed to fetch watchlist', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addSymbol.trim()) return;
    
    setIsAdding(true);
    setAddError('');
    
    try {
      await watchlistService.addToWatchlist(
        addSymbol.toUpperCase().trim(),
        addHigh ? parseFloat(addHigh) : null,
        addLow ? parseFloat(addLow) : null
      );
      setAddSymbol('');
      setAddHigh('');
      setAddLow('');
      setShowAddForm(false);
      fetchWatchlist();
    } catch (err) {
      setAddError(err.response?.data?.message || err.message || 'Failed to add stock');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (item) => {
    setEditingRow(item.symbol);
    setEditHigh(item.alertThresholdHigh?.toString() || '');
    setEditLow(item.alertThresholdLow?.toString() || '');
  };

  const saveEdit = async (symbol) => {
    try {
      await watchlistService.updateThresholds(
        symbol,
        editHigh ? parseFloat(editHigh) : null,
        editLow ? parseFloat(editLow) : null
      );
      setEditingRow(null);
      fetchWatchlist();
    } catch (err) {
       console.error('Failed to update thresholds', err);
    }
  };

  const cancelEdit = () => {
    setEditingRow(null);
  };

  const handleRemove = async (symbol) => {
    try {
      await watchlistService.removeFromWatchlist(symbol);
      if (selectedStock === symbol) {
        setSelectedStock(null);
        setChartData([]);
      }
      fetchWatchlist();
    } catch (err) {
      console.error('Failed to remove stock', err);
    }
  };

  const loadChart = async (symbol) => {
    setSelectedStock(symbol);
    setChartLoading(true);
    try {
      const res = await stockService.getStockBySymbol(symbol);
      if (res.data && Array.isArray(res.data)) {
        const formattedData = [...res.data].reverse().map(item => ({
          time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: item.price
        }));
        setChartData(formattedData);
      }
    } catch (err) {
      console.error('Failed to fetch chart data', err);
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
        <div className="h-64 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Watchlist</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your favorite stocks and set alerts</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? 'Cancel' : 'Add Stock'}
        </button>
      </div>

      {/* ADD STOCK FORM */}
      {showAddForm && (
        <div className="p-6 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Add to Watchlist</h2>
          {addError && <div className="mb-4 p-3 rounded-lg text-sm text-white" style={{ background: 'var(--danger)' }}>{addError}</div>}
          <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Symbol</label>
              <input 
                type="text" required value={addSymbol} onChange={e => setAddSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Alert High ($)</label>
              <input 
                type="number" step="0.01" value={addHigh} onChange={e => setAddHigh(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Alert Low ($)</label>
              <input 
                type="number" step="0.01" value={addLow} onChange={e => setAddLow(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <button 
              type="submit" disabled={isAdding}
              className="w-full md:w-auto px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-black/5"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {/* WATCHLIST TABLE */}
      {watchlist.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
          <Eye size={48} className="mb-4 opacity-20" style={{ color: 'var(--text)' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Your watchlist is empty</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Click 'Add Stock' to start tracking your favorite companies.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <tr>
                  <th className="px-5 py-3 font-medium">Symbol</th>
                  <th className="px-5 py-3 font-medium">Current Price</th>
                  <th className="px-5 py-3 font-medium">Change %</th>
                  <th className="px-5 py-3 font-medium">Alert High</th>
                  <th className="px-5 py-3 font-medium">Alert Low</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                {watchlist.map((item) => {
                  const isEditing = editingRow === item.symbol;
                  const isPositive = item.priceChange !== null ? item.priceChange >= 0 : null;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors cursor-pointer ${selectedStock === item.symbol ? 'bg-black/5' : 'hover:bg-black/5'}`}
                      style={{ color: 'var(--text)' }}
                      onClick={() => !isEditing && loadChart(item.symbol)}
                    >
                      <td className="px-5 py-4 font-bold" onClick={(e) => isEditing && e.stopPropagation()}>{item.symbol}</td>
                      
                      <td className="px-5 py-4 font-medium" onClick={(e) => isEditing && e.stopPropagation()}>
                        {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '—'}
                      </td>
                      
                      <td className="px-5 py-4 font-medium" onClick={(e) => isEditing && e.stopPropagation()}>
                        {item.priceChange !== null ? (
                          <span style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                            {isPositive ? '+' : ''}{item.priceChange}%
                          </span>
                        ) : '—'}
                      </td>
                      
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <input 
                            type="number" step="0.01" value={editHigh} onChange={e => setEditHigh(e.target.value)}
                            className="w-24 px-2 py-1 rounded text-sm outline-none border"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                          />
                        ) : (
                          item.alertThresholdHigh ? `$${item.alertThresholdHigh.toFixed(2)}` : <span className="opacity-50">—</span>
                        )}
                      </td>
                      
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <input 
                            type="number" step="0.01" value={editLow} onChange={e => setEditLow(e.target.value)}
                            className="w-24 px-2 py-1 rounded text-sm outline-none border"
                            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                          />
                        ) : (
                          item.alertThresholdLow ? `$${item.alertThresholdLow.toFixed(2)}` : <span className="opacity-50">—</span>
                        )}
                      </td>
                      
                      <td className="px-5 py-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(item.symbol)} className="p-1.5 rounded-md hover:bg-black/10 text-green-500" title="Save">
                              <Check size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 rounded-md hover:bg-black/10 text-red-500" title="Cancel">
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="p-1.5 rounded-md hover:bg-black/10 opacity-70 hover:opacity-100" style={{ color: 'var(--text)' }} title="Edit Thresholds">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleRemove(item.symbol)} className="p-1.5 rounded-md hover:bg-black/10 opacity-70 hover:opacity-100" style={{ color: 'var(--danger)' }} title="Remove">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHART SECTION */}
      {watchlist.length > 0 && (
        <div className="p-6 rounded-xl shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>
            {selectedStock ? `${selectedStock} Price Chart` : 'Click a stock to view its chart'}
          </h2>
          
          <div className="h-80 w-full flex items-center justify-center">
            {!selectedStock ? (
              <p style={{ color: 'var(--text-secondary)' }}>No stock selected</p>
            ) : chartLoading ? (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-current animate-spin"></div> Loading chart...
              </div>
            ) : chartData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No data available for {selectedStock}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPriceWatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--chart)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis dataKey="price" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                      itemStyle={{ color: 'var(--chart)' }}
                      formatter={(value) => [`$${value}`, "Price"]}
                      labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="price" stroke="var(--chart)" strokeWidth={2} fillOpacity={1} fill="url(#colorPriceWatch)" />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis dataKey="price" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                      itemStyle={{ color: 'var(--chart)' }}
                      formatter={(value) => [`$${value}`, "Price"]}
                      labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="price" stroke="var(--chart)" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: 'var(--accent)' }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
