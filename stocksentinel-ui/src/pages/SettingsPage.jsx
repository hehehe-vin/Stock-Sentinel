import { useTheme } from '../theme/ThemeContext';
import { Palette, Type, Layout, LineChart as LineChartIcon, Check } from 'lucide-react';

export default function SettingsPage() {
  const { 
    currentTheme, setCurrentTheme, themes,
    currentFont, setCurrentFont, fonts,
    sidebarExpanded, setSidebarExpanded,
    chartType, setChartType
  } = useTheme();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Customize your StockSentinel experience.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* APPEARANCE SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <Palette style={{ color: 'var(--accent)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Theme</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setCurrentTheme(key)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${currentTheme === key ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.02] opacity-80 hover:opacity-100'}`}
                style={{ 
                  backgroundColor: theme.bg, 
                  borderColor: currentTheme === key ? theme.accent : theme.border 
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-5 h-5 rounded-full" style={{ background: theme.accent }}></div>
                  {currentTheme === key && <Check size={16} style={{ color: theme.accent }} />}
                </div>
                <p className="font-medium text-sm truncate" style={{ color: theme.text }}>{theme.name}</p>
              </button>
            ))}
          </div>
        </section>

        {/* TYPOGRAPHY SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <Type style={{ color: 'var(--accent)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Typography</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(fonts).map(([key, font]) => (
              <button
                key={key}
                onClick={() => setCurrentFont(key)}
                className="p-4 rounded-xl border-2 text-left transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderColor: currentFont === key ? 'var(--accent)' : 'var(--border)',
                  fontFamily: font.family
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>{font.name}</p>
                  {currentFont === key && <Check size={16} style={{ color: 'var(--accent)' }} />}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The quick brown fox jumps over the lazy dog.</p>
              </button>
            ))}
          </div>
        </section>

        {/* DATA VISUALIZATION SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <LineChartIcon style={{ color: 'var(--accent)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Data Visualization</h2>
          </div>
          
          <div className="p-5 rounded-xl border shadow-sm flex items-center justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text)' }}>Chart Style</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Select your preferred style for rendering stock history charts.</p>
            </div>
            <div className="flex bg-black/10 rounded-lg p-1 border" style={{ borderColor: 'var(--border)' }}>
              <button 
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'area' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                style={{ 
                  background: chartType === 'area' ? 'var(--bg)' : 'transparent',
                  color: chartType === 'area' ? 'var(--text)' : 'var(--text)'
                }}
              >
                Area
              </button>
              <button 
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'line' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                style={{ 
                  background: chartType === 'line' ? 'var(--bg)' : 'transparent',
                  color: chartType === 'line' ? 'var(--text)' : 'var(--text)'
                }}
              >
                Line
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
