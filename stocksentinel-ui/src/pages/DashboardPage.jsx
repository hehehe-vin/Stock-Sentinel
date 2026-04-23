import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { stockService } from '../services/stockService';
import { anomalyService } from '../services/anomalyService';
import { datasourceService } from '../services/datasourceService';
import { watchlistService } from '../services/watchlistService';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceDot } from 'recharts';
import { RotateCw, Activity, AlertTriangle, Layers, Database, Star, CheckSquare, Square, SlidersHorizontal, DollarSign, TrendingUp, Zap, X, Trophy, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function DashboardPage() {
  const { chartType } = useTheme();

  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [activeTab, setActiveTab] = useState('LIVE');

  const [status, setStatus] = useState({ activeSource: 'Loading...' });
  const [anomalyCount, setAnomalyCount] = useState({ totalToday: 0, highCount: 0 });
  const [recentAnomalies, setRecentAnomalies] = useState([]);

  const [stockSummaries, setStockSummaries] = useState([]);
  const [rawSymbolData, setRawSymbolData] = useState({});
  const [watchedSymbols, setWatchedSymbols] = useState(new Set());

  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareViewMode, setCompareViewMode] = useState('value');
  const [liveQuotes, setLiveQuotes] = useState([]);
  const [candleData, setCandleData] = useState({});
  const [volatility, setVolatility] = useState({});
  const [toastNotification, setToastNotification] = useState(null);
  const [compareRange, setCompareRange] = useState(100); // percentage of data to show (0-100)
  const prevAnomalyCountRef = useRef(0);
  const candlesFetchedRef = useRef(new Set());

  // Fetch candle data for a symbol (called once per symbol)
  const fetchCandlesForSymbol = useCallback(async (symbol) => {
    if (candlesFetchedRef.current.has(symbol)) return;
    candlesFetchedRef.current.add(symbol);
    try {
      const res = await datasourceService.getCandles(symbol, '5', 24);
      const candles = Array.isArray(res.data) ? res.data : [];
      setCandleData(prev => ({ ...prev, [symbol]: candles }));
    } catch (err) {
      console.error(`Failed to fetch candles for ${symbol}`, err);
      candlesFetchedRef.current.delete(symbol);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, anomalyCountRes, anomaliesRes, watchlistRes, liveQuotesRes, volatilityRes] = await Promise.all([
        datasourceService.getStatus().catch(() => ({ data: { activeSource: 'Unknown' } })),
        anomalyService.getAnomalyCount().catch(() => ({ data: { totalToday: 0, highCount: 0 } })),
        anomalyService.getAllAnomalies().catch(() => ({ data: [] })),
        watchlistService.getWatchlist().catch(() => ({ data: [] })),
        datasourceService.getLiveQuotes().catch(() => ({ data: [] })),
        anomalyService.getAllVolatility().catch(() => ({ data: [] }))
      ]);

      setStatus(statusRes.data);

      // Toast notification: check if anomaly count increased
      const newCount = anomalyCountRes.data?.totalToday || 0;
      if (prevAnomalyCountRef.current > 0 && newCount > prevAnomalyCountRef.current) {
        const anomalyList = Array.isArray(anomaliesRes.data) ? anomaliesRes.data : [];
        if (anomalyList.length > 0) {
          const latest = anomalyList[0];
          setToastNotification({
            symbol: latest.symbol,
            type: latest.type,
            severity: latest.severity,
            price: latest.priceAtDetection,
            deviation: latest.deviation,
            zScore: latest.zScore || latest.zscore,
          });
          setTimeout(() => setToastNotification(null), 6000);
        }
      }
      prevAnomalyCountRef.current = newCount;
      setAnomalyCount(anomalyCountRes.data);

      const anomalyList = Array.isArray(anomaliesRes.data) ? anomaliesRes.data : [];
      setRecentAnomalies(anomalyList.slice(0, 10));

      // Volatility map
      const volArr = Array.isArray(volatilityRes.data) ? volatilityRes.data : [];
      const volMap = {};
      volArr.forEach(v => { volMap[v.symbol] = v; });
      setVolatility(volMap);

      // Live quotes: direct from API, no DB
      const quotes = Array.isArray(liveQuotesRes.data) ? liveQuotesRes.data : [];
      setLiveQuotes(quotes);

      // Append latest quote to candle data (rightmost point on chart)
      if (quotes.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        setCandleData(prev => {
          const updated = { ...prev };
          quotes.forEach(q => {
            if (updated[q.symbol] && updated[q.symbol].length > 0) {
              const lastCandle = updated[q.symbol][updated[q.symbol].length - 1];
              // Only append if at least 60s since last candle
              if (now - lastCandle.timestamp >= 60) {
                updated[q.symbol] = [...updated[q.symbol], {
                  symbol: q.symbol,
                  timestamp: now,
                  time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                  open: q.price, high: q.price, low: q.price, close: q.price,
                  volume: 0
                }];
              }
            }
          });
          return updated;
        });
      }

      // Candles are fetched lazily when a symbol is selected (see useEffect below)

      // Historical/CSV data: from DB
      const symbolsRes = await stockService.getAllSymbols().catch(() => ({ data: [] }));
      const symbolList = Array.isArray(symbolsRes.data) ? symbolsRes.data : [];

      const historyPromises = symbolList.map(sym => stockService.getStockBySymbol(sym).catch(() => ({ data: [] })));
      const allHistories = await Promise.all(historyPromises);

      const rawMap = {};
      const summaries = [];

      // Build summaries for live data (from API quotes)
      quotes.forEach(q => {
        summaries.push({
          symbol: q.symbol,
          latestPrice: q.price,
          change: q.change,
          changePercent: q.changePercent,
          high: q.high,
          low: q.low,
          open: q.open,
          previousClose: q.previousClose,
          source: 'LIVE'
        });
      });

      // Build summaries for historical/CSV data (from DB)
      symbolList.forEach((sym, index) => {
        let hist = Array.isArray(allHistories[index].data) ? allHistories[index].data : [];
        hist.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        rawMap[sym] = hist;

        const csvEntries = hist.filter(h => h.source === 'CSV');
        if (csvEntries.length > 0) {
          summaries.push({
            symbol: sym,
            latestPrice: csvEntries[0].price,
            source: 'CSV'
          });
        }
      });

      setRawSymbolData(rawMap);
      setStockSummaries(summaries.sort((a, b) => a.symbol.localeCompare(b.symbol)));

      const wSet = new Set((Array.isArray(watchlistRes.data) ? watchlistRes.data : []).map(w => w.symbol));
      setWatchedSymbols(wSet);

    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Lazy-load candles only when a symbol is selected on the Live tab
  useEffect(() => {
    if (activeTab === 'LIVE') {
      selectedSymbols.forEach(sym => fetchCandlesForSymbol(sym));
    }
  }, [selectedSymbols, activeTab, fetchCandlesForSymbol]);

  const handleManualRefresh = async () => {
    setPolling(true);
    try {
      // Reset candle cache so they re-fetch
      candlesFetchedRef.current.clear();
      setCandleData({});
      if (activeTab === 'LIVE') {
        await datasourceService.triggerPoll().catch(() => { });
        // Re-fetch candles for selected symbols
        await Promise.all(selectedSymbols.map(sym => {
          candlesFetchedRef.current.delete(sym);
          return fetchCandlesForSymbol(sym);
        }));
      }
      await fetchData();
    } catch (err) {
      console.error("Poll failed", err);
    } finally {
      setPolling(false);
    }
  };

  const handleToggleWatchlist = async (sym) => {
    try {
      const prev = new Set(watchedSymbols);
      if (prev.has(sym)) {
        prev.delete(sym);
        setWatchedSymbols(prev);
        await watchlistService.removeFromWatchlist(sym);
      } else {
        prev.add(sym);
        setWatchedSymbols(prev);
        await watchlistService.addToWatchlist(sym);
      }
    } catch (err) {
      if (err.response?.status !== 400) {
        console.error('Failed to update watchlist', err);
      }
    }
  };

  const activeSummaries = useMemo(() => {
    return stockSummaries.filter(s => {
      const isStatic = s.source === 'CSV';
      return activeTab === 'STATIC' ? isStatic : !isStatic;
    });
  }, [stockSummaries, activeTab]);

  useEffect(() => {
    const validSymbols = activeSummaries.map(s => s.symbol);
    const filteredSelection = selectedSymbols.filter(s => validSymbols.includes(s));

    if (!isCompareMode && filteredSelection.length !== selectedSymbols.length) {
      setSelectedSymbols(filteredSelection);
    } else if (filteredSelection.length === 0 && validSymbols.length > 0) {
      setSelectedSymbols([validSymbols[0]]);
    }
  }, [activeSummaries]);

  const MAX_COMPARE = 4;

  const toggleSymbolSelection = (sym) => {
    setSelectedSymbols(prev => {
      if (prev.includes(sym)) return prev.filter(s => s !== sym);
      if (isCompareMode && prev.length >= MAX_COMPARE) return prev; // cap at 4
      return [...prev, sym];
    });
  };

  const isMulti = selectedSymbols.length > 1;

  // Determine chart mode:
  //   value = shared Y-axis with $ prices (shows absolute position)
  //   trend = each stock gets independent Y-axis (shows curve detail)
  const chartMode = useMemo(() => {
    if (!isMulti) return 'value';
    if (isCompareMode) return compareViewMode;
    return 'trend'; // All Stocks uses independent axes so each curve shows its shape
  }, [isMulti, isCompareMode, compareViewMode]);

  const isTooFarApart = useMemo(() => {
    if (!isCompareMode || selectedSymbols.length < 2) return false;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    selectedSymbols.forEach(sym => {
      const hist = rawSymbolData[sym] || [];
      if (hist.length > 0) {
        const latestPrice = hist[0].price; // already sorted descending in fetchData
        if (latestPrice < minPrice) minPrice = latestPrice;
        if (latestPrice > maxPrice) maxPrice = latestPrice;
      }
    });

    if (minPrice === Infinity || minPrice === 0) return false;
    return (maxPrice / minPrice) > 2.0;
  }, [isCompareMode, selectedSymbols, rawSymbolData]);

  // Render Engine mappings
  const chartData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];

    if (activeTab === 'LIVE') {
      // Live tab: use candle data for full intraday chart
      if (selectedSymbols.length === 1) {
        const sym = selectedSymbols[0];
        const candles = candleData[sym] || [];
        return candles.map(c => ({
          time: c.time,
          [sym]: c.close,
          [`${sym}_raw`]: c.close,
          [`${sym}_open`]: c.open,
          [`${sym}_high`]: c.high,
          [`${sym}_low`]: c.low,
        }));
      }
      // Multi-symbol live: merge candle data by timestamp
      // Round timestamps to 5-min grid so all stocks align at the same time slots
      const merged = {};
      selectedSymbols.forEach(sym => {
        const candles = candleData[sym] || [];
        candles.forEach(c => {
          const roundedTs = Math.round(c.timestamp / 300) * 300; // snap to 5-min grid
          if (!merged[roundedTs]) {
            merged[roundedTs] = { timeKey: roundedTs, time: c.time };
          }
          merged[roundedTs][`${sym}_raw`] = c.close;
          merged[roundedTs][sym] = c.close;
        });
      });
      let liveResult = Object.values(merged).sort((a, b) => a.timeKey - b.timeKey);
      // Apply range filter for comparator
      if (isCompareMode && compareRange < 100) {
        const startIdx = Math.floor(liveResult.length * (1 - compareRange / 100));
        liveResult = liveResult.slice(startIdx);
      }
      return liveResult;
    }

    // Historical tab: use CSV data from DB
    const merged = {};

    selectedSymbols.forEach(sym => {
      const hist = rawSymbolData[sym] || [];
      const filteredHist = hist.filter(h => h.source === 'CSV');
      const chronoHist = [...filteredHist].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      chronoHist.forEach(item => {
        const timeObj = new Date(item.timestamp);
        const timeKey = timeObj.getTime();

        if (!merged[timeKey]) {
          merged[timeKey] = {
            timeKey,
            time: timeObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
          };
        }

        merged[timeKey][`${sym}_raw`] = item.price;
        merged[timeKey][sym] = item.price;
      });
    });

    let finalArray = Object.values(merged).sort((a, b) => a.timeKey - b.timeKey);
    // Apply range filter for comparator
    if (isCompareMode && compareRange < 100) {
      const startIdx = Math.floor(finalArray.length * (1 - compareRange / 100));
      finalArray = finalArray.slice(startIdx);
    }
    return finalArray;
  }, [selectedSymbols, rawSymbolData, chartMode, activeTab, candleData, isCompareMode, compareRange]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': return 'var(--danger)';
      case 'MEDIUM': return 'var(--warning)';
      case 'LOW': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Build a color map from payload entries
      const colorMap = {};
      payload.forEach(entry => { colorMap[entry.dataKey] = entry.color; });
      const dataPoint = payload[0]?.payload || {};

      return (
        <div className="p-3 shadow-md border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}>
          <p className="mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          {selectedSymbols.map((sym, idx) => {
            const rawPrice = dataPoint[`${sym}_raw`];
            const displayVal = dataPoint[sym];
            if (rawPrice == null && displayVal == null) return null;
            const price = rawPrice ?? displayVal;
            const color = colorMap[sym] || CHART_COLORS[idx % CHART_COLORS.length];

            return (
              <div key={sym} className="flex items-center justify-between gap-4 mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }}></span>
                  <span className="font-medium">{sym}:</span>
                </div>
                <span className="font-mono font-bold">${parseFloat(price).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>)}
        </div>
        <div className="h-96 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-black/10 rounded-lg p-1 border shadow-sm" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('LIVE')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'LIVE' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
              style={{
                background: activeTab === 'LIVE' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'LIVE' ? '#fff' : 'var(--text)'
              }}
            >
              Live Market
            </button>
            <button
              onClick={() => setActiveTab('STATIC')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'STATIC' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
              style={{
                background: activeTab === 'STATIC' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'STATIC' ? '#fff' : 'var(--text)'
              }}
            >
              Historical (CSV)
            </button>
          </div>

          <button
            onClick={handleManualRefresh} disabled={polling}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <RotateCw size={16} className={polling ? "animate-spin" : ""} />
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl flex items-center justify-between shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{activeTab === 'LIVE' ? 'Live Tracked' : 'Historical Stocks'}</p>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{activeSummaries.length}</h3>
          </div>
          <Layers size={24} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="p-5 rounded-xl flex items-center justify-between shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Today's Anomalies</p>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{anomalyCount.totalToday}</h3>
          </div>
          <Activity size={24} style={{ color: 'var(--warning)' }} />
        </div>
        <div className="p-5 rounded-xl flex items-center justify-between shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>High Severity</p>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{anomalyCount.highCount}</h3>
          </div>
          <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
        </div>
        <div className="p-5 rounded-xl flex items-center justify-between shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Engine Source</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status.activeSource === 'Loading...' ? 'animate-pulse bg-gray-500' : 'bg-green-500'}`}></span>
              <h3 className="text-lg font-bold truncate" style={{ color: 'var(--text)' }}>
                {activeTab === 'LIVE' ? status.activeSource : 'STATIC CSV'}
              </h3>
            </div>
          </div>
          <Database size={24} style={{ color: 'var(--success)' }} />
        </div>
      </div>

      <div className={`flex flex-col ${isCompareMode ? 'xl:flex-row' : ''} gap-6`}>

        {isCompareMode && (
          <div
            className="xl:w-1/3 xl:min-w-[300px] xl:max-w-[50vw] border rounded-xl shadow-sm flex flex-col transition-all resize-handle-container"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
              resize: 'horizontal',
              overflow: 'hidden'
            }}
          >
            <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Custom Comparator List</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select multiple stocks to analyze</p>
            </div>
            <div className="overflow-y-auto max-h-96 custom-scrollbar" style={{ height: '100%' }}>
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 shadow-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <tr>
                    <th className="px-5 py-3 font-medium">Symbol</th>
                    <th className="px-5 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 font-medium text-center">Watch</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                  {activeSummaries.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No stocks available.</td>
                    </tr>
                  ) : activeSummaries.map((s) => {
                    const isSelected = selectedSymbols.includes(s.symbol);
                    const isWatched = watchedSymbols.has(s.symbol);
                    return (
                      <tr key={s.symbol} onClick={() => toggleSymbolSelection(s.symbol)} className="transition-colors cursor-pointer hover:bg-black/5" style={{ color: 'var(--text)', background: isSelected ? 'var(--bg-secondary)' : 'transparent' }}>
                        <td className="px-5 py-3.5 font-bold flex items-center gap-3">
                          {isSelected ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} /> : <Square size={16} opacity={0.3} />}
                          {s.symbol}
                        </td>
                        <td className="px-5 py-3.5 font-mono">${s.latestPrice.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-center flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleToggleWatchlist(s.symbol)} className={`p-1.5 rounded transition-colors ${isWatched ? 'bg-yellow-500/10 hover:bg-yellow-500/20' : 'hover:bg-black/10 opacity-70 hover:opacity-100'}`} title="Add/Remove Watchlist">
                            <Star size={18} fill={isWatched ? 'gold' : 'none'} color={isWatched ? 'gold' : 'currentColor'} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={`flex-1 p-6 border rounded-xl shadow-sm flex flex-col transition-all min-w-0`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  {isCompareMode ? 'Stock Comparator' : isMulti ? 'All Active Stocks' : `Price History – ${selectedSymbols[0]}`}
                </h2>
                {!isMulti && selectedSymbols.length === 1 && (
                  <button
                    onClick={() => handleToggleWatchlist(selectedSymbols[0])}
                    className={`p-1.5 rounded transition-colors ${watchedSymbols.has(selectedSymbols[0]) ? 'bg-yellow-500/10 hover:bg-yellow-500/20' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                  >
                    <Star size={18} fill={watchedSymbols.has(selectedSymbols[0]) ? 'gold' : 'none'} color={watchedSymbols.has(selectedSymbols[0]) ? 'gold' : 'currentColor'} />
                  </button>
                )}
                {/* Comparator Value/Trend toggle */}
                {isCompareMode && (
                  <div className="flex rounded-md overflow-hidden border ml-2" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setCompareViewMode('value')}
                      className={`px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors`}
                      style={{
                        background: compareViewMode === 'value' ? 'var(--accent)' : 'transparent',
                        color: compareViewMode === 'value' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <DollarSign size={12} /> Value
                    </button>
                    <button
                      onClick={() => setCompareViewMode('trend')}
                      className={`px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors`}
                      style={{
                        background: compareViewMode === 'trend' ? 'var(--accent)' : 'transparent',
                        color: compareViewMode === 'trend' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <TrendingUp size={12} /> Trend
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {!isMulti ? 'Absolute USD tracking.'
                  : chartMode === 'trend' ? 'Each stock auto-scaled independently · Hover for actual prices'
                    : isCompareMode ? 'Absolute USD on shared axis · Shows price positions' : 'Each stock auto-scaled independently.'}
              </p>
              {isCompareMode && compareViewMode === 'value' && isTooFarApart && (
                <div className="mt-2 text-xs flex items-center gap-1.5 p-1.5 px-2 rounded bg-red-500/10 text-red-500 font-medium">
                  <AlertTriangle size={12} />
                  <span>Price gap &gt; 2x! Lower-priced curves may appear flat. Use Trend mode for detail.</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
              {activeSummaries.map(s => {
                const isActiveSingle = selectedSymbols.length === 1 && selectedSymbols[0] === s.symbol;
                return (
                  <button
                    key={s.symbol}
                    onClick={() => {
                      setSelectedSymbols([s.symbol]);
                      setIsCompareMode(false);
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActiveSingle && !isCompareMode ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                    style={{
                      background: isActiveSingle && !isCompareMode ? 'var(--accent)' : 'transparent',
                      color: isActiveSingle && !isCompareMode ? '#fff' : 'var(--text)',
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {s.symbol}
                      {volatility[s.symbol] && volatility[s.symbol].rating !== 'LOW' && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none ${volatility[s.symbol].rating === 'EXTREME' ? 'animate-pulse' : ''}`}
                          style={{
                            background: volatility[s.symbol].rating === 'EXTREME' ? '#dc2626'
                              : volatility[s.symbol].rating === 'HIGH' ? '#ef4444'
                                : '#f59e0b'
                          }}
                          title={`${volatility[s.symbol].recentCount} anomalies in 7d | Avg dev: ${volatility[s.symbol].avgDeviation}%`}
                        >
                          <Zap size={8} className="inline -mt-px" /> {volatility[s.symbol].rating}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}

              <div className="w-px h-6 mx-1 self-center" style={{ background: 'var(--border)' }}></div>

              <button
                onClick={() => {
                  setSelectedSymbols(activeSummaries.map(s => s.symbol));
                  setIsCompareMode(false);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isMulti && !isCompareMode ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  background: isMulti && !isCompareMode ? 'var(--accent)' : 'transparent',
                  color: isMulti && !isCompareMode ? '#fff' : 'var(--text)',
                }}
              >
                All Stocks
              </button>

              <button
                onClick={() => {
                  if (!isCompareMode) {
                    setSelectedSymbols(activeSummaries.slice(0, MAX_COMPARE).map(s => s.symbol));
                  }
                  setIsCompareMode(!isCompareMode);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors border ${isCompareMode ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  background: isCompareMode ? 'var(--accent)' : 'transparent',
                  color: isCompareMode ? '#fff' : 'var(--text)',
                  borderColor: isCompareMode ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <SlidersHorizontal size={14} /> Comparator
              </button>

            </div>
          </div>

            {/* COMPARATOR VALUE MODE — Data Comparison Cards */}
            {isCompareMode && compareViewMode === 'value' && selectedSymbols.length >= 2 ? (
              <div className="mt-4 space-y-6">
                <div className={`grid gap-4 ${selectedSymbols.length <= 2 ? 'grid-cols-2' : selectedSymbols.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
                  {selectedSymbols.map((sym, idx) => {
                    const summary = activeSummaries.find(s => s.symbol === sym) || {};
                    const vol = volatility[sym] || {};
                    const candles = candleData[sym] || [];
                    const price = summary.latestPrice || 0;
                    const change = summary.change || 0;
                    const changePct = summary.changePercent || 0;
                    const high = summary.high || price;
                    const low = summary.low || price;
                    const open = summary.open || price;
                    const prevClose = summary.previousClose || price;
                    const intradayRange = open > 0 ? (((high - low) / open) * 100).toFixed(2) : '0.00';
                    const gapPct = prevClose > 0 ? (((open - prevClose) / prevClose) * 100).toFixed(2) : '0.00';
                    const color = CHART_COLORS[idx % CHART_COLORS.length];
                    const isUp = change >= 0;
                    const dayRangePct = high > low ? ((price - low) / (high - low)) * 100 : 50;
                    const sparkData = candles.slice(-30).map(c => ({ v: c.close }));

                    return (
                      <div key={sym} className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderTop: `3px solid ${color}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{sym}</h3>
                          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isUp ? 'text-green-400' : 'text-red-400'}`} style={{ background: isUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {isUp ? '+' : ''}{changePct.toFixed(2)}%
                          </div>
                        </div>

                        <p className="text-2xl font-bold font-mono mb-1" style={{ color: 'var(--text)' }}>${price.toFixed(2)}</p>
                        <p className="text-xs font-mono mb-3" style={{ color: isUp ? 'var(--success)' : 'var(--danger)' }}>
                          {isUp ? '+' : ''}{change.toFixed(2)} today
                        </p>

                        {sparkData.length > 2 && (
                          <div className="h-12 mb-3 -mx-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sparkData}>
                                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                            <span>${low.toFixed(2)}</span>
                            <span>Day Range</span>
                            <span>${high.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="h-full rounded-full" style={{ width: `${dayRangePct}%`, background: color }}></div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex justify-between"><span>Open</span><span className="font-mono" style={{ color: 'var(--text)' }}>${open.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Prev Close</span><span className="font-mono" style={{ color: 'var(--text)' }}>${prevClose.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Intraday Range</span><span className="font-mono" style={{ color: 'var(--text)' }}>{intradayRange}%</span></div>
                          <div className="flex justify-between"><span>Gap</span><span className="font-mono" style={{ color: parseFloat(gapPct) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{parseFloat(gapPct) >= 0 ? '+' : ''}{gapPct}%</span></div>
                        </div>

                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          {vol.rating ? (
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${vol.rating === 'EXTREME' ? 'animate-pulse' : ''}`}
                                style={{ background: vol.rating === 'EXTREME' ? '#dc2626' : vol.rating === 'HIGH' ? '#ef4444' : vol.rating === 'MODERATE' ? '#f59e0b' : '#22c55e' }}>
                                <Zap size={8} className="inline -mt-px" /> {vol.rating}
                              </span>
                              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{vol.recentCount || 0} anomalies (7d)</span>
                            </div>
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>No volatility data</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Performance Summary</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <th className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Metric</th>
                          {selectedSymbols.map((sym, idx) => (
                            <th key={sym} className="px-4 py-2.5 text-right font-bold" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }}>{sym}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                        {(() => {
                          const rows = [
                            { label: 'Price', key: 'price', fmt: v => `$${v.toFixed(2)}`, higher: true },
                            { label: 'Daily Change', key: 'changePct', fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higher: true },
                            { label: 'Day High', key: 'high', fmt: v => `$${v.toFixed(2)}`, higher: true },
                            { label: 'Day Low', key: 'low', fmt: v => `$${v.toFixed(2)}`, higher: false },
                            { label: 'Intraday Range', key: 'intradayRange', fmt: v => `${v.toFixed(2)}%`, higher: false },
                            { label: 'Gap %', key: 'gapPct', fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higher: true },
                            { label: 'Volatility', key: 'volRating', fmt: v => v, isText: true },
                            { label: 'Anomalies (7d)', key: 'recentCount', fmt: v => v, higher: false },
                            { label: 'Avg Deviation', key: 'avgDev', fmt: v => `${v.toFixed(2)}%`, higher: false },
                          ];
                          const stockData = selectedSymbols.map(sym => {
                            const s = activeSummaries.find(x => x.symbol === sym) || {};
                            const v = volatility[sym] || {};
                            const p = s.latestPrice || 0;
                            const o = s.open || p;
                            const h = s.high || p;
                            const l = s.low || p;
                            const pc = s.previousClose || p;
                            return {
                              price: p, changePct: s.changePercent || 0, high: h, low: l,
                              intradayRange: o > 0 ? ((h - l) / o) * 100 : 0,
                              gapPct: pc > 0 ? ((o - pc) / pc) * 100 : 0,
                              volRating: v.rating || 'N/A', recentCount: v.recentCount || 0, avgDev: v.avgDeviation || 0,
                            };
                          });

                          return rows.map(row => {
                            const values = stockData.map(d => row.isText ? d[row.key] : d[row.key]);
                            const numVals = row.isText ? [] : values.map(Number);
                            const bestIdx = row.isText ? -1 : (row.higher ? numVals.indexOf(Math.max(...numVals)) : numVals.indexOf(Math.min(...numVals)));

                            return (
                              <tr key={row.key} className="transition-colors hover:bg-black/5">
                                <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                                {values.map((val, i) => (
                                  <td key={i} className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--text)' }}>
                                    <span className={`${bestIdx === i && !row.isText ? 'font-bold' : ''}`} style={bestIdx === i && !row.isText ? { color: 'var(--success)' } : {}}>
                                      {bestIdx === i && !row.isText && <Trophy size={10} className="inline -mt-0.5 mr-1" style={{ color: 'var(--success)' }} />}
                                      {row.isText ? val : row.fmt(Number(val))}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <>
              {isCompareMode && compareViewMode === 'trend' && (
                <div className="flex items-center gap-3 mt-3 mb-2 px-1">
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Range:</span>
                  <input type="range" min={10} max={100} value={compareRange} onChange={(e) => setCompareRange(Number(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
                  <span className="text-xs font-mono font-bold min-w-[3ch] text-right" style={{ color: 'var(--text)' }}>{compareRange}%</span>
                </div>
              )}
              <div className="h-[450px] w-full mt-2">
                {selectedSymbols.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Layers size={32} className="mb-2 opacity-50" />
                    <p>Select stocks to view</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} dy={10} />

                    {chartMode === 'trend' ? (
                      selectedSymbols.map((sym, idx) => (
                        <YAxis
                          key={`y-${sym}`}
                          yAxisId={sym}
                          domain={['dataMin - 1', 'dataMax + 1']}
                          hide={true}
                          tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                          stroke="var(--text-secondary)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                        />
                      ))
                    ) : chartMode === 'value' && isMulti ? (
                      <YAxis
                        yAxisId="shared"
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => `$${v}`}
                        stroke="var(--text-secondary)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={55}
                      />
                    ) : (
                      selectedSymbols.map((sym, idx) => (
                        <YAxis
                          key={`y-${sym}`}
                          yAxisId={sym}
                          domain={['auto', 'auto']}
                          hide={idx !== 0}
                          tickFormatter={(v) => `$${v}`}
                          stroke="var(--text-secondary)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                        />
                      ))
                    )}

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />

                    {selectedSymbols.map((sym, idx) => {
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      const axisId = chartMode === 'trend' ? sym : (isMulti ? 'shared' : sym);
                      return (
                        <Area connectNulls={true} key={sym} yAxisId={axisId} type="monotone" dataKey={sym} name={sym} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.05} />
                      )
                    })}
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} dy={10} />

                    {chartMode === 'trend' ? (
                      selectedSymbols.map((sym, idx) => (
                        <YAxis
                          key={`y-${sym}`}
                          yAxisId={sym}
                          domain={['dataMin - 1', 'dataMax + 1']}
                          hide={true}
                          tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                          stroke="var(--text-secondary)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                        />
                      ))
                    ) : chartMode === 'value' && isMulti ? (
                      <YAxis
                        yAxisId="shared"
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => `$${v}`}
                        stroke="var(--text-secondary)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={55}
                      />
                    ) : (
                      selectedSymbols.map((sym, idx) => (
                        <YAxis
                          key={`y-${sym}`}
                          yAxisId={sym}
                          domain={['auto', 'auto']}
                          hide={idx !== 0}
                          tickFormatter={(v) => `$${v}`}
                          stroke="var(--text-secondary)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                        />
                      ))
                    )}

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />

                    {selectedSymbols.map((sym, idx) => {
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      const axisId = chartMode === 'trend' ? sym : (isMulti ? 'shared' : sym);
                      return (
                        <Line connectNulls={true} key={sym} yAxisId={axisId} type="monotone" dataKey={sym} name={sym} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                      )
                    })}
                  </LineChart>
                )}
                  </ResponsiveContainer>
                )}
              </div>
              </>
            )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm mt-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Recent Output Anomalies</h2>
          <Link to="/anomalies" className="text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>View Full Ledger</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <tr>
                <th className="px-5 py-3 font-medium">Symbol</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Deviation / Z-Score</th>
                <th className="px-5 py-3 font-medium">Time (Local)</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
              {recentAnomalies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No recent anomalies detected.
                  </td>
                </tr>
              ) : (
                recentAnomalies.map((anom) => (
                  <tr key={anom.id} className="transition-colors hover:bg-black/5" style={{ color: 'var(--text)' }}>
                    <td className="px-5 py-4 font-bold">{anom.symbol}</td>
                    <td className="px-5 py-4">{anom.type}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white inline-block"
                        style={{ background: getSeverityColor(anom.severity) }}>
                        {anom.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">${anom.priceAtDetection?.toFixed(2)}</td>
                    <td className="px-5 py-4 font-mono">
                      {anom.deviation ? `${anom.deviation}%` : `Z=${anom.zscore || anom.zScore || 'N/A'}`}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(anom.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      {toastNotification && (
        <div
          className="fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border max-w-sm"
          style={{
            background: 'var(--bg-card)',
            borderColor: toastNotification.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)',
            borderLeftWidth: '4px',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} style={{ color: toastNotification.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                Anomaly Detected
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{toastNotification.symbol}</span>
                {' — '}{toastNotification.type}
                {' '}
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                  style={{ background: getSeverityColor(toastNotification.severity) }}
                >
                  {toastNotification.severity}
                </span>
              </p>
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                ${toastNotification.price?.toFixed(2)}
                {toastNotification.deviation ? ` | Dev: ${toastNotification.deviation}%` : ''}
                {toastNotification.zScore ? ` | Z: ${toastNotification.zScore}` : ''}
              </p>
            </div>
            <button onClick={() => setToastNotification(null)} className="p-1 rounded hover:bg-black/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
