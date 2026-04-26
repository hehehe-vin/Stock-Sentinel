import { useState, useRef } from 'react';
import { stockService } from '../services/stockService';
import { anomalyService } from '../services/anomalyService';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Loader2, Activity } from 'lucide-react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function CsvUploadPage() {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [result, setResult] = useState(null);
  const [backtestAnomalies, setBacktestAnomalies] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError("Please select a valid CSV file.");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setBacktestAnomalies(null);
    
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const preview = lines.slice(0, 5).map(line => line.split(','));
      setPreviewRows(preview);

      // Parse full data for chart
      const parsedData = lines.slice(1).map(line => {
        const parts = line.split(',');
        return {
          timestamp: parts[3]?.trim(),
          price: parseFloat(parts[1]?.trim() || 0),
        };
      }).filter(d => !isNaN(d.price));
      
      setChartData(parsedData);
    } catch (err) {
      console.error("Preview failed", err);
    }
  };

  // Drag and Drop Handlers
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewRows([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    
    try {
      const res = await stockService.uploadCsv(file);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBacktest = async () => {
    if (!file) return;
    setIsBacktesting(true);
    setError(null);
    
    try {
      const res = await anomalyService.backtestCsv(file);
      setBacktestAnomalies(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Backtest failed");
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>CSV Import</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Upload historical stock data for analysis and backtesting.</p>
      </div>

      {/* DROPZONE */}
      <div 
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all ${
          isDragging ? 'bg-opacity-20 scale-[1.02]' : 'hover:bg-opacity-10'
        }`}
        style={{ 
          borderColor: isDragging || file ? 'var(--accent)' : 'var(--border)',
          backgroundColor: isDragging ? 'var(--accent)' : 'var(--bg-card)'
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect} 
        />
        
        {file ? (
          <div className="flex flex-col items-center w-full" onClick={(e) => e.stopPropagation()}>
            <FileText size={48} className="mb-4" style={{ color: 'var(--accent)' }} />
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>{file.name}</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{(file.size / 1024).toFixed(2)} KB</p>
            
            <div className="flex gap-3">
              <button 
                onClick={clearSelection} disabled={isUploading || isBacktesting}
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-black/5 transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Clear
              </button>
              <button 
                onClick={handleUpload} disabled={isUploading || isBacktesting}
                className="px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-md"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
              <button 
                onClick={handleBacktest} disabled={isUploading || isBacktesting}
                className="px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-md bg-purple-600 text-white"
              >
                {isBacktesting ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                {isBacktesting ? 'Running...' : 'Run Backtest'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <UploadCloud size={48} className="mb-4 opacity-50" style={{ color: 'var(--text)' }} />
            <h3 className="text-xl font-bold mb-2 cursor-pointer" style={{ color: 'var(--text)' }}>
              Drag & Drop your CSV file here
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>or click to browse from your computer</p>
            <div className="text-xs p-2 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Expected Headers: symbol, price, volume, timestamp (yyyy-mm-ddThh:mm:ss)
            </div>
          </>
        )}
      </div>

      {/* PREVIEW */}
      {previewRows.length > 0 && !result && (
        <div className="p-5 rounded-xl shadow-sm animate-in fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Data Preview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <tr>
                  {previewRows[0].map((header, i) => (
                    <th key={i} className="px-4 py-2 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                {previewRows.slice(1).map((row, i) => (
                  <tr key={i} style={{ color: 'var(--text)' }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-4 rounded-xl flex items-start gap-3 animate-in fade-in" style={{ background: 'rgba(var(--danger-rgb, 239, 68, 68), 0.1)', border: '1px solid var(--danger)' }}>
          <AlertCircle size={20} style={{ color: 'var(--danger)' }} className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--danger)' }}>Upload Failed</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* SUCCESS RESULTS */}
      {result && (
        <div className="p-6 rounded-xl shadow-sm animate-in fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Import Summary</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Rows</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>{result.totalRows}</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Imported</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>{result.importedRows}</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Skipped/Errors</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--warning)' }}>{result.skippedRows}</p>
            </div>
          </div>
          
          {result.errors && result.errors.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--danger)' }}>
                <AlertCircle size={16} /> Error Details
              </h3>
              <div className="p-4 rounded-lg max-h-40 overflow-y-auto" style={{ background: 'var(--bg-secondary)' }}>
                <ul className="list-disc pl-5 space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>{err}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-xs font-medium" style={{ color: 'var(--text)' }}>...and {result.errors.length - 10} more.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BACKTEST CHART & RESULTS */}
      {backtestAnomalies && (
        <div className="space-y-6 animate-in fade-in">
          {/* Chart */}
          <div className="p-5 rounded-xl shadow-sm h-96" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Activity size={20} style={{ color: 'var(--accent)' }}/> Backtest Visualization
            </h2>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={false} />
                
                {/* Overlay anomalies */}
                <Scatter 
                  data={backtestAnomalies.map(a => ({
                    timestamp: a.timestamp,
                    price: a.priceAtDetection,
                    severity: a.severity
                  }))} 
                  dataKey="price" 
                  fill="red" 
                  r={6} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="p-5 rounded-xl shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Backtest Results: {backtestAnomalies.length} Anomalies Detected</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <tr>
                    <th className="px-4 py-2 font-medium">Timestamp</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Severity</th>
                    <th className="px-4 py-2 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                  {backtestAnomalies.map((anomaly, i) => (
                    <tr key={i} style={{ color: 'var(--text)' }}>
                      <td className="px-4 py-3">{new Date(anomaly.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3">{anomaly.type}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: anomaly.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)' }}>{anomaly.severity}</td>
                      <td className="px-4 py-3">${anomaly.priceAtDetection.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
