/**
 * Configuración centralizada del Frontend
 * Define URLs, endpoints y constantes globales
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },
  // Recursos
  RECURSOS: {
    LIST: '/api/recursos',
    CREATE: '/api/recursos',
    UPDATE: (id) => `/api/recursos/${id}`,
    DELETE: (id) => `/api/recursos/${id}`,
    RESTORE: (id) => `/api/recursos/${id}/restaurar`,
    UPLOAD_IMAGE: (id) => `/api/recursos/${id}/upload-imagen`,
    QRCODE: (id) => `/api/recursos/${id}/qrcode`,
    CATEGORIAS: '/api/recursos/categorias'
  },
  // Usuarios
  USUARIOS: {
    LIST: '/api/usuarios',
    CREATE: '/api/usuarios',
    UPDATE: (id) => `/api/usuarios/${id}`,
    DELETE: (id) => `/api/usuarios/${id}`,
    GET: (id) => `/api/usuarios/${id}`
  },
  // Prestamos
  PRESTAMOS: {
    LIST: '/api/prestamos',
    CREATE: '/api/prestamos',
    DEVOLVER: (id) => `/api/prestamos/${id}/devolver`,
    RENOVAR: (id) => `/api/prestamos/${id}/renovar`,
    ESTADISTICAS: '/api/prestamos/estadisticas'
  },
  // Reservas
  RESERVAS: {
    LIST: '/api/reservas',
    CREATE: '/api/reservas',
    CONFIRMAR: (id) => `/api/reservas/${id}/confirmar`,
    CANCELAR: (id) => `/api/reservas/${id}`
  },
  // Notificaciones
  NOTIFICACIONES: {
    LIST: '/api/notificaciones',
    MARCAR_LEIDA: (id) => `/api/notificaciones/${id}/marcar-leida`
  },
  // Informes
  INFORMES: {
    ESTADISTICAS: '/api/informes/estadisticas',
    EXCEL: '/api/informes/exportar-excel',
    PDF: '/api/informes/exportar-pdf'
  },
  // Historial
  HISTORIAL: {
    LIST: '/api/historial'
  }
};

// Configuración del cliente HTTP
export const HTTP_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Roles de usuario
export const USER_ROLES = {
  ADMIN: 'administrador',
  TRABAJADOR: 'trabajador',
  USUARIO: 'usuario'
};

// Estados de recursos
export const RESOURCE_STATES = {
  DISPONIBLE: 'disponible',
  PRESTADO: 'prestado',
  MANTENIMIENTO: 'mantenimiento'
};

// Estados de préstamos
export const LOAN_STATES = {
  ACTIVO: 'activo',
  DEVUELTO: 'devuelto',
  VENCIDO: 'vencido'
};

// Estados de reservas
export const RESERVATION_STATES = {
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  CANCELADA: 'cancelada',
  COMPLETADA: 'completada'
};

// Palabras clave para filtros
export const FILTER_OPTIONS = {
  resources: [
    { value: 'disponible', label: 'Disponible' },
    { value: 'prestado', label: 'Prestado' },
    { value: 'mantenimiento', label: 'Mantenimiento' }
  ],
  loans: [
    { value: 'activo', label: 'Activo' },
    { value: 'devuelto', label: 'Devuelto' },
    { value: 'vencido', label: 'Vencido' }
  ],
  reservations: [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'completada', label: 'Completada' }
  ]
};

/**
 * Función helper para construir URLs con parámetros
 */
export const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, value);
    }
  });
  return query.toString();
};

/**
 * Función helper para obtener token
 */
export const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

/**
 * Función helper para obtener refresh token
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Función helper para guardar tokens
 */
export const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Función helper para limpiar tokens
 */
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const CONFIG = {
  API_BASE_URL,
  API_ENDPOINTS,
  HTTP_CONFIG,
  USER_ROLES,
  RESOURCE_STATES,
  LOAN_STATES,
  RESERVATION_STATES,
  FILTER_OPTIONS
};

export default CONFIG;
