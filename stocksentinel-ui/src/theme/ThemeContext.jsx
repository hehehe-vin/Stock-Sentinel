import { createContext, useState, useEffect, useContext } from 'react';
import { THEMES, FONTS } from './themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'defaultDark');
  const [currentFont, setCurrentFont] = useState(() => localStorage.getItem('font') || 'inter');
  const [sidebarExpanded, setSidebarExpanded] = useState(() => localStorage.getItem('sidebarExpanded') !== 'false');
  const [chartType, setChartType] = useState(() => localStorage.getItem('chartType') || 'area');

  useEffect(() => {
    const theme = THEMES[currentTheme] || THEMES.defaultDark;
    const root = document.documentElement;

    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg-secondary', theme.bgSecondary);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--success', theme.success);
    root.style.setProperty('--danger', theme.danger);
    root.style.setProperty('--warning', theme.warning);
    root.style.setProperty('--sidebar', theme.sidebar);
    root.style.setProperty('--sidebar-text', theme.sidebarText);
    root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
    root.style.setProperty('--chart', theme.chart);

    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const font = FONTS[currentFont] || FONTS.inter;
    
    let linkElement = document.getElementById('theme-font-link');
    if (!linkElement) {
      linkElement = document.createElement('link');
      linkElement.id = 'theme-font-link';
      linkElement.rel = 'stylesheet';
      document.head.appendChild(linkElement);
    }
    linkElement.href = font.url;

    document.documentElement.style.setProperty('--font', font.family);
    localStorage.setItem('font', currentFont);
  }, [currentFont]);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', sidebarExpanded);
  }, [sidebarExpanded]);

  useEffect(() => {
    localStorage.setItem('chartType', chartType);
  }, [chartType]);

  return (
    <ThemeContext.Provider value={{
      currentTheme, setCurrentTheme,
      currentFont, setCurrentFont,
      sidebarExpanded, setSidebarExpanded,
      chartType, setChartType,
      themes: THEMES,
      fonts: FONTS
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
