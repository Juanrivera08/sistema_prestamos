import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Inicializar estado desde localStorage o preferencia del sistema
  const [darkMode, setDarkMode] = useState(() => {
    // Solo acceder a localStorage en el cliente
    if (typeof window === 'undefined') return false;
    
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return saved === 'true';
      }
      // Si no hay preferencia guardada, usar la preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark;
    } catch (error) {
      console.error('Error al leer localStorage:', error);
      return false;
    }
  });

  // Función para aplicar el tema al DOM
  const applyTheme = useCallback((isDark) => {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
      console.log('✅ Modo oscuro activado');
    } else {
      root.classList.remove('dark');
      console.log('✅ Modo claro activado');
    }
    
    // Guardar preferencia en localStorage
    try {
      localStorage.setItem('darkMode', isDark.toString());
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
    }
  }, []);

  // Aplicar el tema cuando cambie el estado
  useEffect(() => {
    applyTheme(darkMode);
  }, [darkMode, applyTheme]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prevMode) => {
      const newMode = !prevMode;
      console.log('🔄 Toggle: Cambiando de', prevMode, 'a', newMode);
      // Aplicar inmediatamente para respuesta instantánea
      const root = document.documentElement;
      if (newMode) {
        root.classList.add('dark');
        console.log('✅ Modo oscuro activado');
      } else {
        root.classList.remove('dark');
        console.log('✅ Modo claro activado');
      }
      // Guardar en localStorage
      try {
        localStorage.setItem('darkMode', newMode.toString());
      } catch (error) {
        console.error('Error al guardar en localStorage:', error);
      }
      return newMode;
    });
  }, []);

  const value = {
    darkMode,
    toggleDarkMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

