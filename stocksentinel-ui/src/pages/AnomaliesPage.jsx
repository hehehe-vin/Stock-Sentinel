import { useState, useEffect, useMemo } from 'react';
import { anomalyService } from '../services/anomalyService';
import { Download, Filter, Search, AlertTriangle, ChevronDown, ChevronRight, Zap, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnomaliesPage() {
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [volatilityScores, setVolatilityScores] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  
  // Accordion State
  const [expandedSymbol, setExpandedSymbol] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [anomalyRes, volRes] = await Promise.all([
        anomalyService.getAllAnomalies(),
        anomalyService.getAllVolatility().catch(() => ({ data: [] }))
      ]);
      setAnomalies(Array.isArray(anomalyRes.data) ? anomalyRes.data : []);
      setVolatilityScores(Array.isArray(volRes.data) ? volRes.data : []);
    } catch (err) {
      console.error('Failed to fetch anomalies', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'HIGH': return 'var(--danger)';
      case 'MEDIUM': return 'var(--warning)';
      case 'LOW': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const getRatingColor = (rating) => {
    switch(rating) {
      case 'EXTREME': return '#dc2626';
      case 'HIGH': return '#ef4444';
      case 'MODERATE': return '#f59e0b';
      case 'LOW': return '#22c55e';
      default: return 'var(--text-secondary)';
    }
  };

  const getRatingIcon = (rating) => {
    switch(rating) {
      case 'EXTREME': return '🔥';
      case 'HIGH': return '⚡';
      case 'MODERATE': return '⚠️';
      case 'LOW': return '🟢';
      default: return '●';
    }
  };

  // Filter Data
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(anom => {
      const matchSearch = anom.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSeverity = filterSeverity === 'ALL' || anom.severity === filterSeverity;
      return matchSearch && matchSeverity;
    });
  }, [anomalies, searchTerm, filterSeverity]);

  // Group by Symbol
  const groupedAnomalies = useMemo(() => {
    const groups = {};
    filteredAnomalies.forEach(anom => {
      if (!groups[anom.symbol]) groups[anom.symbol] = [];
      groups[anom.symbol].push(anom);
    });
    // Sort by most recent anomaly in each group
    Object.keys(groups).forEach(symbol => {
      groups[symbol].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
    return groups;
  }, [filteredAnomalies]);

  // Build frequency data for mini-charts (anomalies per day, last 30 days)
  const getFrequencyData = (items) => {
    const now = new Date();
    const days = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), count: 0 };
    }
    items.forEach(anom => {
      const key = new Date(anom.timestamp).toISOString().split('T')[0];
      if (days[key]) days[key].count++;
    });
    return Object.values(days);
  };

  const exportToCsv = () => {
    if (anomalies.length === 0) return;
    
    const headers = ['Symbol', 'Type', 'Severity', 'Deviation/Z-Score', 'Price', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...filteredAnomalies.map(a => [
        a.symbol,
        a.type,
        a.severity,
        a.deviation ? `${a.deviation}%` : `Z=${a.zscore || a.zScore || 'N/A'}`,
        a.priceAtDetection,
        a.timestamp
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `anomalies_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
        <div className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
        <div className="h-96 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Anomalies Data</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Complete history of detected market anomalies.</p>
        </div>
        <button 
          onClick={exportToCsv}
          disabled={filteredAnomalies.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* VOLATILITY SUMMARY CARDS */}
      {volatilityScores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {volatilityScores.map(vol => (
            <div 
              key={vol.symbol}
              className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${expandedSymbol === vol.symbol ? 'ring-2' : ''}`}
              style={{ 
                background: 'var(--bg-card)', 
                borderColor: 'var(--border)',
                ringColor: getRatingColor(vol.rating)
              }}
              onClick={() => setExpandedSymbol(expandedSymbol === vol.symbol ? null : vol.symbol)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{vol.symbol}</span>
                <span 
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${vol.rating === 'EXTREME' ? 'animate-pulse' : ''}`}
                  style={{ background: getRatingColor(vol.rating) }}
                >
                  {getRatingIcon(vol.rating)} {vol.rating}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{vol.totalAnomalies}</span> total
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{vol.recentCount}</span> this week
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Avg: <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{vol.avgDeviation}%</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text"
            placeholder="Search by symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors border"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm outline-none border cursor-pointer"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'} 
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>
        </div>
      </div>

      {/* GROUPED ANOMALIES LIST */}
      <div className="space-y-4">
        {Object.keys(groupedAnomalies).length === 0 ? (
          <div className="py-12 text-center rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex flex-col items-center justify-center">
              <AlertTriangle size={40} className="mb-3 opacity-20" style={{ color: 'var(--text)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No anomalies found matching criteria.</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedAnomalies).map(([symbol, items]) => {
            const isExpanded = expandedSymbol === symbol;
            const highCount = items.filter(i => i.severity === 'HIGH').length;
            const medCount = items.filter(i => i.severity === 'MEDIUM').length;
            const volScore = volatilityScores.find(v => v.symbol === symbol);
            const freqData = getFrequencyData(items);
            
            return (
              <div key={symbol} className="rounded-xl border shadow-sm overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {/* Accordion Header */}
                <button 
                  onClick={() => setExpandedSymbol(isExpanded ? null : symbol)}
                  className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-black/5"
                >
                  <div className="flex items-center gap-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{symbol}</h2>
                    <div className="flex gap-2 flex-wrap">
                       <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                         Total: {items.length}
                       </span>
                       {highCount > 0 && (
                         <span className="px-2 py-1 rounded text-xs font-bold text-white shadow-sm" style={{ background: 'var(--danger)' }}>
                           {highCount} High
                         </span>
                       )}
                       {medCount > 0 && (
                         <span className="px-2 py-1 rounded text-xs font-bold text-white shadow-sm" style={{ background: 'var(--warning)' }}>
                           {medCount} Med
                         </span>
                       )}
                       {volScore && (
                         <span 
                           className={`px-2 py-1 rounded text-xs font-bold text-white shadow-sm ${volScore.rating === 'EXTREME' ? 'animate-pulse' : ''}`}
                           style={{ background: getRatingColor(volScore.rating) }}
                         >
                           <Zap size={10} className="inline -mt-px" /> {volScore.rating}
                         </span>
                       )}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                    {/* Frequency Mini Chart */}
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Anomaly Frequency (Last 30 Days)
                        </p>
                      </div>
                      <div className="h-20">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={freqData}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: 'var(--text)'
                              }}
                              formatter={(value) => [`${value} anomalies`, 'Count']}
                            />
                            <Bar 
                              dataKey="count" 
                              fill={volScore ? getRatingColor(volScore.rating) : 'var(--accent)'} 
                              radius={[2, 2, 0, 0]}
                              opacity={0.8}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Anomaly Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          <tr>
                            <th className="px-6 py-3 font-medium">Detector Type</th>
                            <th className="px-6 py-3 font-medium">Severity</th>
                            <th className="px-6 py-3 font-medium">Deviation / Z-Score</th>
                            <th className="px-6 py-3 font-medium">Price</th>
                            <th className="px-6 py-3 font-medium">Detection Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                          {items.map((anom) => (
                            <tr key={anom.id} className="transition-colors hover:bg-black/5" style={{ color: 'var(--text)' }}>
                              <td className="px-6 py-4">{anom.type}</td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1.5 rounded-full text-xs font-bold text-white inline-block"
                                      style={{ background: getSeverityColor(anom.severity) }}>
                                  {anom.severity}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs">
                                {anom.deviation ? `${anom.deviation}%` : `Z=${anom.zscore || anom.zScore || 'N/A'}`}
                              </td>
                              <td className="px-6 py-4">${anom.priceAtDetection?.toFixed(2)}</td>
                              <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                                {new Date(anom.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
