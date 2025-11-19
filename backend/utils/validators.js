// Validadores reutilizables

/**
 * Valida formato de email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida que la contraseña tenga al menos 6 caracteres
 */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Sanitiza string para prevenir inyección SQL básica
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Valida formato de fecha (YYYY-MM-DD) o datetime (YYYY-MM-DD HH:MM o YYYY-MM-DDTHH:MM)
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  // Aceptar formato de fecha (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  // Aceptar formato datetime (YYYY-MM-DD HH:MM o YYYY-MM-DDTHH:MM)
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;
  
  if (!dateRegex.test(dateString) && !datetimeRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString.replace(' ', 'T'));
  return date instanceof Date && !isNaN(date);
};

/**
 * Valida formato de datetime (YYYY-MM-DD HH:MM o YYYY-MM-DDTHH:MM)
 */
export const isValidDateTime = (dateTimeString) => {
  if (!dateTimeString || typeof dateTimeString !== 'string') return false;
  
  // Limpiar espacios al inicio y final
  const cleaned = dateTimeString.trim();
  
  // Aceptar formato datetime (YYYY-MM-DD HH:MM o YYYY-MM-DDTHH:MM)
  // También acepta YYYY-MM-DD HH:MM:SS pero lo normalizamos
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;
  
  if (!datetimeRegex.test(cleaned)) {
    return false;
  }
  
  // Convertir espacio a T para compatibilidad con Date
  const normalized = cleaned.replace(' ', 'T');
  const date = new Date(normalized);
  
  // Verificar que la fecha sea válida
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }
  
  return true;
};

