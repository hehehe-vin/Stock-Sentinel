import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { stockService } from '../services/stockService';
import { anomalyService } from '../services/anomalyService';
import { datasourceService } from '../services/datasourceService';
import { watchlistService } from '../services/watchlistService';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RotateCw, Activity, AlertTriangle, Layers, Database, Star, CheckSquare, Square, SlidersHorizontal } from 'lucide-react';

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

  const fetchData = async () => {
    try {
      const [statusRes, symbolsRes, countRes, anomaliesRes, watchlistRes] = await Promise.all([
        datasourceService.getStatus().catch(()=>({data:{activeSource:'Unknown'}})),
        stockService.getAllSymbols().catch(()=>({data:[]})),
        anomalyService.getAnomalyCount().catch(()=>({data:{totalToday:0, highCount:0}})),
        anomalyService.getAllAnomalies().catch(()=>({data:[]})),
        watchlistService.getWatchlist().catch(()=>({data:[]}))
      ]);
      
      setStatus(statusRes.data);
      setAnomalyCount(countRes.data);
      
      const anomalyList = Array.isArray(anomaliesRes.data) ? anomaliesRes.data : [];
      setRecentAnomalies(anomalyList.slice(0, 10));
      
      const symbolList = Array.isArray(symbolsRes.data) ? symbolsRes.data : [];
      
      const historyPromises = symbolList.map(sym => stockService.getStockBySymbol(sym).catch(()=>({data:[]})));
      const allHistories = await Promise.all(historyPromises);
      
      const rawMap = {};
      const summaries = [];
      
      symbolList.forEach((sym, index) => {
        let hist = Array.isArray(allHistories[index].data) ? allHistories[index].data : [];
        hist.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        rawMap[sym] = hist;
        
        if (hist.length > 0) {
          summaries.push({
            symbol: sym,
            latestPrice: hist[0].price,
            source: hist[0].source || 'UNKNOWN'
          });
        }
      });
      
      setRawSymbolData(rawMap);
      setStockSummaries(summaries.sort((a,b) => a.symbol.localeCompare(b.symbol)));
      
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

  const handleManualRefresh = async () => {
    setPolling(true);
    try {
      if (activeTab === 'LIVE') await datasourceService.triggerPoll();
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
      if(err.response?.status !== 400) {
         console.error('Failed to update watchlist', err);
      }
    }
  };

  const activeSummaries = useMemo(() => {
    return stockSummaries.filter(s => {
      const isStatic = s.source === 'CSV_IMPORT';
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

  const toggleSymbolSelection = (sym) => {
    setSelectedSymbols(prev => 
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const isMulti = selectedSymbols.length > 1;

  // Render Engine mappings
  const chartData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];
    
    const merged = {};

    selectedSymbols.forEach(sym => {
       const hist = rawSymbolData[sym] || [];
       const chronoHist = [...hist].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

       chronoHist.forEach(item => {
         const timeObj = new Date(item.timestamp);
         const timeKey = timeObj.getTime();
         
         if (!merged[timeKey]) {
           merged[timeKey] = { 
             timeKey, 
             time: timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
           };
         }
         
         merged[timeKey][sym] = item.price;
       });
    });
    
    let finalArray = Object.values(merged).sort((a,b) => a.timeKey - b.timeKey);
    return finalArray;
  }, [selectedSymbols, rawSymbolData]);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'HIGH': return 'var(--danger)';
      case 'MEDIUM': return 'var(--warning)';
      case 'LOW': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 shadow-md border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}>
          <p className="mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          {payload.map(entry => {
             if (entry.value === undefined || entry.value === null) return null;
             
             return (
               <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.color }}></span>
                    <span className="font-medium">{entry.name}:</span>
                 </div>
                 <span className="font-mono font-bold">${parseFloat(entry.value).toFixed(2)}</span>
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
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>)}
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
                                 {isSelected ? <CheckSquare size={16} style={{color: 'var(--accent)'}} /> : <Square size={16} opacity={0.3} />}
                                 {s.symbol}
                              </td>
                              <td className="px-5 py-3.5 font-mono">${s.latestPrice.toFixed(2)}</td>
                              <td className="px-5 py-3.5 text-center flex justify-center" onClick={(e)=>e.stopPropagation()}>
                                 <button onClick={()=>handleToggleWatchlist(s.symbol)} className={`p-1.5 rounded transition-colors ${isWatched ? 'bg-yellow-500/10 hover:bg-yellow-500/20' : 'hover:bg-black/10 opacity-70 hover:opacity-100'}`} title="Add/Remove Watchlist">
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
                    {isMulti ? `All Active Stocks View` : `Price History - ${selectedSymbols[0]}`}
                  </h2>
                  {!isMulti && selectedSymbols.length === 1 && (
                    <button 
                        onClick={() => handleToggleWatchlist(selectedSymbols[0])} 
                        className={`p-1.5 rounded transition-colors ${watchedSymbols.has(selectedSymbols[0]) ? 'bg-yellow-500/10 hover:bg-yellow-500/20' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                    >
                        <Star size={18} fill={watchedSymbols.has(selectedSymbols[0]) ? 'gold' : 'none'} color={watchedSymbols.has(selectedSymbols[0]) ? 'gold' : 'currentColor'} />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {isMulti ? `Viewing all stocks simultaneously` : `Absolute USD tracking.`}
                </p>
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
                       {s.symbol}
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
                       setSelectedSymbols(activeSummaries.map(s => s.symbol));
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
                      
                      {selectedSymbols.map((sym, idx) => (
                        <YAxis 
                           key={`y-${sym}`}
                           yAxisId={sym}
                           domain={['auto', 'auto']} 
                           hide={isMulti || idx !== 0}
                           tickFormatter={(v) => `$${v}`}
                           stroke="var(--text-secondary)" 
                           fontSize={11} 
                           tickLine={false} 
                           axisLine={false} 
                           width={55}
                        />
                      ))}

                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                      
                      {selectedSymbols.map((sym, idx) => {
                         const color = CHART_COLORS[idx % CHART_COLORS.length];
                         return (
                            <Area connectNulls={true} key={sym} yAxisId={sym} type="monotone" dataKey={sym} name={sym} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.05} />
                         )
                      })}
                    </AreaChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} dy={10} />
                      
                      {selectedSymbols.map((sym, idx) => (
                        <YAxis 
                           key={`y-${sym}`}
                           yAxisId={sym}
                           domain={['auto', 'auto']} 
                           hide={isMulti || idx !== 0}
                           tickFormatter={(v) => `$${v}`}
                           stroke="var(--text-secondary)" 
                           fontSize={11} 
                           tickLine={false} 
                           axisLine={false} 
                           width={55}
                        />
                      ))}

                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                      
                      {selectedSymbols.map((sym, idx) => {
                         const color = CHART_COLORS[idx % CHART_COLORS.length];
                         return (
                            <Line connectNulls={true} key={sym} yAxisId={sym} type="monotone" dataKey={sym} name={sym} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                         )
                      })}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
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
    </div>
  );
}
