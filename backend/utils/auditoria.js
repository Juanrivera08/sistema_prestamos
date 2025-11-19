import pool from '../config/database.js';

/**
 * Registra una acción en el sistema de auditoría
 */
export const registrarAuditoria = async (usuarioId, accion, tablaAfectada, registroId = null, datosAnteriores = null, datosNuevos = null, req = null) => {
  try {
    const ipAddress = req ? (req.ip || req.connection?.remoteAddress || null) : null;
    const userAgent = req ? req.get('user-agent') || null : null;

    await pool.query(`
      INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      usuarioId,
      accion,
      tablaAfectada,
      registroId,
      datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
};

/**
 * Middleware para registrar automáticamente acciones
 */
export const middlewareAuditoria = (accion, tablaAfectada) => {
  return async (req, res, next) => {
    // Guardar datos originales antes de la modificación
    if (req.method === 'PUT' || req.method === 'DELETE') {
      try {
        const { id } = req.params;
        if (id && tablaAfectada) {
          const [registros] = await pool.query(`SELECT * FROM ${tablaAfectada} WHERE id = ?`, [id]);
          if (registros.length > 0) {
            req.auditoriaDatosAnteriores = registros[0];
          }
        }
      } catch (error) {
        // Ignorar errores en auditoría
      }
    }

    // Interceptar respuesta para registrar después de la acción
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode < 400 && req.user) {
        const registroId = req.params?.id || data?.id || null;
        const datosNuevos = req.method === 'POST' || req.method === 'PUT' ? req.body : null;
        
        registrarAuditoria(
          req.user.id,
          accion,
          tablaAfectada,
          registroId,
          req.auditoriaDatosAnteriores || null,
          datosNuevos,
          req
        );
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

