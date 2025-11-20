import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Obtener estadísticas generales
router.get('/estadisticas', authenticateToken, async (req, res) => {
  try {
    // Admin y trabajadores pueden ver todas las estadísticas
    const isAdminOrTrabajador = req.user.rol === 'administrador' || req.user.rol === 'trabajador';

    // Total de recursos (solo activos, excluyendo eliminados)
    const [totalRecursos] = await pool.query(
      'SELECT COUNT(*) as total FROM recursos WHERE deleted_at IS NULL'
    );
    
    // Recursos por estado (solo activos)
    const [recursosPorEstado] = await pool.query(
      'SELECT estado, COUNT(*) as cantidad FROM recursos WHERE deleted_at IS NULL GROUP BY estado'
    );

    // Total de préstamos
    let prestamosQuery = 'SELECT COUNT(*) as total FROM prestamos WHERE 1=1';
    const prestamosParams = [];
    
    if (!isAdminOrTrabajador) {
      prestamosQuery += ' AND usuario_id = ?';
      prestamosParams.push(req.user.id);
    }

    const [totalPrestamos] = await pool.query(prestamosQuery, prestamosParams);

    // Préstamos por estado
    let prestamosEstadoQuery = 'SELECT estado, COUNT(*) as cantidad FROM prestamos WHERE 1=1';
    if (!isAdminOrTrabajador) {
      prestamosEstadoQuery += ' AND usuario_id = ?';
    }
    prestamosEstadoQuery += ' GROUP BY estado';
    const [prestamosPorEstado] = await pool.query(prestamosEstadoQuery, prestamosParams);

    // Recursos más prestados (solo activos)
    let recursosPrestadosQuery = `
      SELECT 
        r.id,
        r.codigo,
        r.nombre,
        COUNT(p.id) as veces_prestado
      FROM recursos r
      LEFT JOIN prestamos p ON r.id = p.recurso_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.id, r.codigo, r.nombre
      ORDER BY veces_prestado DESC
      LIMIT 10
    `;
    const [recursosMasPrestados] = await pool.query(recursosPrestadosQuery);

    // Usuarios con más préstamos (solo admin)
    let usuariosPrestamosQuery = `
      SELECT 
        u.id,
        u.codigo,
        u.nombre_completo,
        COUNT(p.id) as total_prestamos
      FROM usuarios u
      LEFT JOIN prestamos p ON u.id = p.usuario_id
      GROUP BY u.id, u.codigo, u.nombre_completo
      ORDER BY total_prestamos DESC
      LIMIT 10
    `;
    const [usuariosMasPrestamos] = await pool.query(usuariosPrestamosQuery);

    // Préstamos vencidos
    let prestamosVencidosQuery = `
      SELECT COUNT(*) as total 
      FROM prestamos 
      WHERE estado = 'activo' 
      AND fecha_devolucion_prevista < NOW()
    `;
    if (!isAdminOrTrabajador) {
      prestamosVencidosQuery += ' AND usuario_id = ?';
    }
    const [prestamosVencidos] = await pool.query(prestamosVencidosQuery, prestamosParams);

    res.json({
      recursos: {
        total: totalRecursos[0].total,
        porEstado: recursosPorEstado
      },
      prestamos: {
        total: totalPrestamos[0].total,
        porEstado: prestamosPorEstado,
        vencidos: prestamosVencidos[0].total
      },
      recursosMasPrestados,
      usuariosMasPrestamos: isAdminOrTrabajador ? usuariosMasPrestamos : []
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

// Generar informe de préstamos
router.get('/prestamos', authenticateToken, async (req, res) => {
  try {
    const { usuario_id, recurso_id, estado, fecha_inicio, fecha_fin, formato } = req.query;

    let query = `
      SELECT 
        p.id,
        p.fecha_prestamo,
        p.fecha_devolucion_prevista,
        p.fecha_devolucion_real,
        p.estado,
        p.observaciones,
        u.codigo as usuario_codigo,
        u.nombre_completo as usuario_nombre,
        u.email as usuario_email,
        r.codigo as recurso_codigo,
        r.nombre as recurso_nombre,
        r.descripcion as recurso_descripcion
      FROM prestamos p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      INNER JOIN recursos r ON p.recurso_id = r.id
      WHERE 1=1
    `;
    const params = [];

    // Si es usuario estándar, solo ver sus préstamos. Admin y trabajadores ven todos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
      query += ' AND p.usuario_id = ?';
      params.push(req.user.id);
    } else if (usuario_id) {
      query += ' AND p.usuario_id = ?';
      params.push(usuario_id);
    }

    if (recurso_id) {
      query += ' AND p.recurso_id = ?';
      params.push(recurso_id);
    }

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }

    if (fecha_inicio) {
      query += ' AND p.fecha_prestamo >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND p.fecha_prestamo <= ?';
      params.push(fecha_fin);
    }

    query += ' ORDER BY p.fecha_prestamo DESC';

    const [prestamos] = await pool.query(query, params);

    // Si se solicita exportación
    if (formato === 'excel') {
      return exportarExcel(prestamos, res);
    } else if (formato === 'pdf') {
      return exportarPDF(prestamos, res);
    }

    res.json(prestamos);
  } catch (error) {
    console.error('Error al generar informe:', error);
    res.status(500).json({ message: 'Error al generar informe' });
  }
});

// Función para exportar a Excel
function exportarExcel(data, res) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data.map(p => ({
      'ID': p.id,
      'Fecha Préstamo': p.fecha_prestamo,
      'Fecha Devolución Prevista': p.fecha_devolucion_prevista,
      'Fecha Devolución Real': p.fecha_devolucion_real || '',
      'Estado': p.estado,
      'Usuario Código': p.usuario_codigo,
      'Usuario Nombre': p.usuario_nombre,
      'Usuario Email': p.usuario_email,
      'Recurso Código': p.recurso_codigo,
      'Recurso Nombre': p.recurso_nombre,
      'Observaciones': p.observaciones || ''
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Préstamos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=prestamos.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).json({ message: 'Error al exportar a Excel' });
  }
}

// Función para exportar a PDF
function exportarPDF(data, res) {
  try {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=prestamos.pdf');
    
    doc.pipe(res);
    
    doc.fontSize(20).text('Informe de Préstamos', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total de registros: ${data.length}`, { align: 'center' });
    doc.moveDown(2);

    data.forEach((prestamo, index) => {
      if (index > 0) {
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      }

      doc.fontSize(14).text(`Préstamo #${prestamo.id}`, { underline: true });
      doc.fontSize(10);
      doc.text(`Usuario: ${prestamo.usuario_nombre} (${prestamo.usuario_codigo})`);
      doc.text(`Recurso: ${prestamo.recurso_nombre} (${prestamo.recurso_codigo})`);
      doc.text(`Fecha Préstamo: ${prestamo.fecha_prestamo}`);
      doc.text(`Fecha Devolución Prevista: ${prestamo.fecha_devolucion_prevista}`);
      if (prestamo.fecha_devolucion_real) {
        doc.text(`Fecha Devolución Real: ${prestamo.fecha_devolucion_real}`);
      }
      doc.text(`Estado: ${prestamo.estado}`);
      if (prestamo.observaciones) {
        doc.text(`Observaciones: ${prestamo.observaciones}`);
      }
    });

    doc.end();
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    res.status(500).json({ message: 'Error al exportar a PDF' });
  }
}

export default router;

