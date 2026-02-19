/**
 * Sistema de logging centralizado
 * Usa console en desarrollo, archivos en producción
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Colores ANSI para output en consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Logger centralizado
 */
export const logger = {
  /**
   * Log de información
   */
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = isDevelopment ? `${colors.cyan}[INFO]${colors.reset}` : '[INFO]';
    console.log(`${prefix} ${timestamp} - ${message}`, data || '');
  },

  /**
   * Log de error
   */
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const prefix = isDevelopment ? `${colors.red}[ERROR]${colors.reset}` : '[ERROR]';
    console.error(`${prefix} ${timestamp} - ${message}`);
    if (error) {
      console.error(error);
    }
  },

  /**
   * Log de advertencia
   */
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = isDevelopment ? `${colors.yellow}[WARN]${colors.reset}` : '[WARN]';
    console.log(`${prefix} ${timestamp} - ${message}`, data || '');
  },

  /**
   * Log de éxito
   */
  success: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = isDevelopment ? `${colors.green}[SUCCESS]${colors.reset}` : '[SUCCESS]';
    console.log(`${prefix} ${timestamp} - ${message}`, data || '');
  },

  /**
   * Log de debug
   */
  debug: (message, data = null) => {
    if (!isDevelopment) return; // Solo en desarrollo
    const timestamp = new Date().toISOString();
    const prefix = `${colors.blue}[DEBUG]${colors.reset}`;
    console.log(`${prefix} ${timestamp} - ${message}`, data || '');
  },

  /**
   * Log de request HTTP
   */
  http: (method, path, statusCode, time) => {
    const timestamp = new Date().toISOString();
    const statusColor = statusCode >= 400 ? colors.red : statusCode >= 300 ? colors.yellow : colors.green;
    const prefix = `${statusColor}[${statusCode}]${colors.reset}`;
    console.log(`${prefix} ${method} ${path} (${time}ms) - ${timestamp}`);
  },

  /**
   * Log de base de datos
   */
  database: (action, table, duration) => {
    const timestamp = new Date().toISOString();
    const prefix = isDevelopment ? `${colors.cyan}[DB]${colors.reset}` : '[DB]';
    console.log(`${prefix} ${timestamp} - ${action} on ${table} (${duration}ms)`);
  }
};

/**
 * Middleware para logging de requests
 */
export const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Interceptar res.send para loguear response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    logger.http(req.method, req.path, res.statusCode, duration);
    originalSend.call(this, data);
  };

  next();
};

export default logger;
