import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, saveTokens, clearTokens, getRefreshToken } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configurar interceptor para refresh token automático
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Agregar interceptor de response para manejar token expirado
      setupInterceptors();
      fetchUser();
    } else {
      setLoading(false);
    }

    return () => {
      // Cleanup
      axios.interceptors.response.eject();
    };
  }, []);

  // Setup de interceptores para refresh automático
  const setupInterceptors = () => {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Si es 401 (token expirado) e intentamos refrescar
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          getRefreshToken()
        ) {
          originalRequest._retry = true;

          try {
            const refreshToken = getRefreshToken();
            const response = await axios.post(API_ENDPOINTS.AUTH.REFRESH, {
              refreshToken
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            
            // Guardar nuevos tokens
            saveTokens(accessToken, newRefreshToken);
            
            // Actualizar header
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            // Reintentar original request
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Si refresh falla, logout
            handleLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.AUTH.ME);
      setUser(response.data.data.user || response.data.user);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      clearTokens();
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      
      saveTokens(accessToken, refreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al iniciar sesión'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      const { accessToken, refreshToken, user } = response.data.data;
      
      saveTokens(accessToken, refreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrar usuario'
      };
    }
  };

  const handleLogout = () => {
    clearTokens();
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const logout = async () => {
    try {
      // Llamar al endpoint de logout en el backend
      await axios.post(API_ENDPOINTS.AUTH.LOGOUT).catch(() => {
        // Ignorar errores del logout en backend
      });
    } finally {
      handleLogout();
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.rol === 'administrador',
    isTrabajador: user?.rol === 'trabajador' || user?.rol === 'administrador',
    isEstudiante: user?.rol === 'usuario' || user?.rol === 'estudiante'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

