import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('tema') || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('tema', theme);
  }, [theme]);
  return { theme, toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark') };
}
