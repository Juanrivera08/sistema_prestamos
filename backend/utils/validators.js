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
 * Valida formato de fecha (YYYY-MM-DD)
 */
export const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

