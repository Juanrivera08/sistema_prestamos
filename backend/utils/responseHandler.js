/**
 * Helper para respuestas estandarizadas en toda la API
 */

export const successResponse = (res, data, message = 'Éxito', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorResponse = (res, error, message = 'Error', statusCode = 400) => {
  const errorMessage = error?.message || message;
  const errorStack = process.env.NODE_ENV === 'development' ? error?.stack : undefined;
  
  return res.status(statusCode).json({
    success: false,
    message: errorMessage,
    ...(errorStack && { stack: errorStack })
  });
};

export const paginatedResponse = (res, data, pagination, message = 'Éxito', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      current_page: pagination.page,
      per_page: pagination.limit,
      total: pagination.total,
      total_pages: Math.ceil(pagination.total / pagination.limit),
      has_next_page: pagination.page < Math.ceil(pagination.total / pagination.limit),
      has_prev_page: pagination.page > 1
    }
  });
};

export const validationError = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: 'Error de validación',
    errors
  });
};

/**
 * Middleware para manejo de errores centralizado
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';

  return errorResponse(res, err, message, statusCode);
};
