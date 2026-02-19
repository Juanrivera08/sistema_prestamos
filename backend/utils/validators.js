// Validadores reutilizables

/**
 * Valida formato de email RFC 5322 mejorado
 */
export const isValidEmail = (email) => {
  // Validación RFC 5322 simplificada pero robusta
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Validaciones adicionales
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  if (emailRegex.test(email)) {
    const [localPart, ...domainParts] = email.split('@');
    const domain = domainParts.join('@');
    
    // Validar local part (antes del @)
    if (localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;
    
    // Validar domain
    if (domain.length > 255) return false;
    if (!domain.includes('.')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.endsWith('-')) return false;
    
    // Validar que dominio tenga TLD válido (mínimo 2 caracteres)
    const tld = domain.split('.').pop();
    if (tld.length < 2 || tld.length > 6) return false;
    
    return true;
  }
  return false;
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

