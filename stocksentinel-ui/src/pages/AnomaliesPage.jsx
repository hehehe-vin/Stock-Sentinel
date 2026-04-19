import { useState, useEffect, useMemo } from 'react';
import { anomalyService } from '../services/anomalyService';
import { Download, Filter, Search, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

export default function AnomaliesPage() {
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  
  // Accordion State
  const [expandedSymbol, setExpandedSymbol] = useState(null);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await anomalyService.getAllAnomalies();
      setAnomalies(Array.isArray(res.data) ? res.data : []);
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
            
            return (
              <div key={symbol} className="rounded-xl border shadow-sm overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {/* Accordion Header */}
                <button 
                  onClick={() => setExpandedSymbol(isExpanded ? null : symbol)}
                  className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-black/5"
                >
                  <div className="flex items-center gap-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{symbol}</h2>
                    <div className="flex gap-2">
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
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
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
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
