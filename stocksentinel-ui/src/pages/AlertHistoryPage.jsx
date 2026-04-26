import { useState, useEffect, useMemo } from 'react';
import { alertService } from '../services/alertService';
import { Bell, Filter, Search, Calendar } from 'lucide-react';

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [symbolFilter, setSymbolFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  useEffect(() => {
    const fetchAlerts = (isInitial = false) => {
      alertService.getMyAlerts()
        .then(res => {
          setAlerts(res.data);
          if (isInitial) setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch alerts", err);
          if (isInitial) setLoading(false);
        });
    };

    // Initial fetch
    fetchAlerts(true);

    // Background polling every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': return 'var(--danger)';
      case 'EXTREME': return 'var(--danger)';
      case 'MEDIUM': return 'var(--warning)';
      case 'LOW': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Symbol Filter
      if (symbolFilter && !alert.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) {
        return false;
      }

      // Severity Filter
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter !== 'ALL') {
        if (!alert.createdAt) return false;
        
        const alertDate = new Date(alert.createdAt);
        const now = new Date();
        const diffHours = (now - alertDate) / (1000 * 60 * 60);

        if (dateFilter === '24H' && diffHours > 24) return false;
        if (dateFilter === '7D' && diffHours > 24 * 7) return false;
        if (dateFilter === '30D' && diffHours > 24 * 30) return false;
      }

      return true;
    });
  }, [alerts, symbolFilter, severityFilter, dateFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
        <div className="h-96 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text)' }}>
            <Bell size={28} style={{ color: 'var(--accent)' }} />
            Alert History
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Review all anomaly notifications sent to your account.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Search Symbol</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="e.g. AAPL" 
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--accent)' }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Severity</label>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--accent)' }}
            >
              <option value="ALL">All Severities</option>
              <option value="EXTREME">Extreme</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Time Range</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--accent)' }}
            >
              <option value="ALL">All Time</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <Bell size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>No Alerts Found</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or wait for new anomalies to trigger.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id} 
              className="p-5 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md animate-in fade-in slide-in-from-top-2 duration-500"
              style={{ 
                background: 'var(--bg-card)', 
                borderColor: 'var(--border)',
                borderLeftWidth: '4px',
                borderLeftColor: getSeverityColor(alert.severity)
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-lg" style={{ color: 'var(--text)' }}>{alert.symbol}</span>
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ background: getSeverityColor(alert.severity) }}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/5" style={{ color: 'var(--text-secondary)' }}>
                    {alert.alertType}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{alert.message}</p>
                <div className="flex items-center gap-4 mt-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  {alert.emailSent ? (
                    <span className="text-green-500">Email Delivered</span>
                  ) : (
                    <span className="text-gray-500">Email Skipped (Settings/Error)</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
