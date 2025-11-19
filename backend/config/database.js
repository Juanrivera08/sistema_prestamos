import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'sistema_prestamos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para inicializar la base de datos
export const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Crear tabla de usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre_completo VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol ENUM('administrador', 'usuario', 'trabajador') DEFAULT 'usuario',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Agregar rol 'trabajador' al ENUM si no existe (para tablas existentes)
    try {
      await connection.query(`
        ALTER TABLE usuarios 
        MODIFY COLUMN rol ENUM('administrador', 'usuario', 'trabajador') DEFAULT 'usuario'
      `);
    } catch (error) {
      // El ENUM ya tiene el valor o hay otro error, ignorar si es por duplicado
      if (!error.message.includes('Duplicate') && !error.message.includes('already exists')) {
        console.warn('Advertencia al modificar ENUM de rol:', error.message);
      }
    }

    // Crear tabla de recursos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recursos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        descripcion TEXT,
        estado ENUM('disponible', 'prestado', 'mantenimiento') DEFAULT 'disponible',
        ubicacion VARCHAR(255),
        imagen VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_categoria (categoria),
        INDEX idx_estado (estado)
      )
    `);

    // Agregar columna categoria si no existe (para tablas existentes)
    try {
      await connection.query(`
        ALTER TABLE recursos 
        ADD COLUMN categoria VARCHAR(100) AFTER nombre,
        ADD INDEX idx_categoria (categoria)
      `);
    } catch (error) {
      // La columna ya existe, ignorar error
      if (!error.message.includes('Duplicate column name')) {
        console.warn('Advertencia al agregar columna categoria:', error.message);
      }
    }

    // Crear tabla de préstamos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prestamos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        recurso_id INT NOT NULL,
        trabajador_id INT NOT NULL,
        trabajador_nombre VARCHAR(255) NOT NULL,
        trabajador_email VARCHAR(255) NOT NULL,
        fecha_prestamo DATETIME NOT NULL,
        fecha_devolucion_prevista DATETIME NOT NULL,
        fecha_devolucion_real DATETIME,
        estado ENUM('activo', 'devuelto', 'vencido') DEFAULT 'activo',
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
        FOREIGN KEY (trabajador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_usuario (usuario_id),
        INDEX idx_recurso (recurso_id),
        INDEX idx_trabajador (trabajador_id),
        INDEX idx_estado (estado)
      )
    `);

    // Agregar columnas de trabajador si no existen (para tablas existentes)
    try {
      await connection.query(`
        ALTER TABLE prestamos 
        ADD COLUMN trabajador_id INT AFTER recurso_id,
        ADD COLUMN trabajador_nombre VARCHAR(255) AFTER trabajador_id,
        ADD COLUMN trabajador_email VARCHAR(255) AFTER trabajador_nombre,
        ADD FOREIGN KEY (trabajador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        ADD INDEX idx_trabajador (trabajador_id)
      `);
    } catch (error) {
      // Las columnas ya existen, ignorar error
      if (!error.message.includes('Duplicate column name') && !error.message.includes('Duplicate key name')) {
        console.warn('Advertencia al agregar columnas de trabajador:', error.message);
      }
    }

    // Migrar campos DATE a DATETIME si existen (para tablas existentes)
    try {
      // Verificar si las columnas son DATE y cambiarlas a DATETIME
      const [columns] = await connection.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'prestamos' 
        AND COLUMN_NAME = 'fecha_prestamo'
      `);
      
      if (columns.length > 0 && columns[0].COLUMN_TYPE === 'date') {
        await connection.query(`
          ALTER TABLE prestamos 
          MODIFY COLUMN fecha_prestamo DATETIME NOT NULL,
          MODIFY COLUMN fecha_devolucion_prevista DATETIME NOT NULL,
          MODIFY COLUMN fecha_devolucion_real DATETIME
        `);
        console.log('Columnas de fecha migradas a DATETIME');
      }
    } catch (error) {
      // Las columnas ya son DATETIME o hay otro error, ignorar si es por tipo incorrecto
      if (!error.message.includes('Duplicate') && !error.message.includes('already exists')) {
        console.warn('Advertencia al migrar columnas a DATETIME:', error.message);
      }
    }

    // Crear usuario administrador por defecto si no existe
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sistema.com';
    const [adminExists] = await connection.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [adminEmail]
    );

    if (adminExists.length === 0) {
      const bcrypt = await import('bcryptjs');
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminCodigo = process.env.ADMIN_CODIGO || 'ADMIN001';
      
      const hashedPassword = await bcrypt.default.hash(adminPassword, 10);
      await connection.query(
        `INSERT INTO usuarios (codigo, nombre_completo, email, password, rol) 
         VALUES (?, ?, ?, ?, ?)`,
        [adminCodigo, 'Administrador', adminEmail, hashedPassword, 'administrador']
      );
      console.log(`Usuario administrador creado: ${adminEmail} / ${adminPassword}`);
      console.log('⚠️  IMPORTANTE: Cambia la contraseña del administrador después del primer inicio de sesión');
    }

    // Crear tabla de reservas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        recurso_id INT NOT NULL,
        fecha_reserva DATETIME NOT NULL,
        fecha_inicio_prevista DATETIME NOT NULL,
        fecha_fin_prevista DATETIME NOT NULL,
        estado ENUM('pendiente', 'confirmada', 'cancelada', 'completada') DEFAULT 'pendiente',
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
        INDEX idx_usuario (usuario_id),
        INDEX idx_recurso (recurso_id),
        INDEX idx_estado (estado),
        INDEX idx_fecha_reserva (fecha_reserva)
      )
    `);

    // Crear tabla de notificaciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo ENUM('prestamo_vencido', 'prestamo_proximo_vencer', 'devolucion_registrada', 'reserva_confirmada', 'reserva_cancelada', 'multa_aplicada', 'sistema') NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        leida BOOLEAN DEFAULT FALSE,
        relacion_id INT,
        relacion_tipo VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_usuario (usuario_id),
        INDEX idx_leida (leida),
        INDEX idx_tipo (tipo)
      )
    `);

    // Crear tabla de auditoría
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        accion VARCHAR(100) NOT NULL,
        tabla_afectada VARCHAR(50) NOT NULL,
        registro_id INT,
        datos_anteriores JSON,
        datos_nuevos JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuario (usuario_id),
        INDEX idx_tabla (tabla_afectada),
        INDEX idx_accion (accion),
        INDEX idx_fecha (created_at)
      )
    `);

    // Crear tabla de multas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS multas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestamo_id INT NOT NULL,
        usuario_id INT NOT NULL,
        monto DECIMAL(10, 2) NOT NULL,
        dias_retraso INT NOT NULL,
        estado ENUM('pendiente', 'pagada', 'cancelada') DEFAULT 'pendiente',
        fecha_pago DATETIME,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_prestamo (prestamo_id),
        INDEX idx_usuario (usuario_id),
        INDEX idx_estado (estado)
      )
    `);

    // Crear tabla de configuraciones del sistema
    await connection.query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT,
        tipo VARCHAR(50) DEFAULT 'string',
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_clave (clave)
      )
    `);

    // Insertar configuraciones por defecto
    try {
      await connection.query(`
        INSERT IGNORE INTO configuraciones (clave, valor, tipo, descripcion) VALUES
        ('dias_antes_notificacion', '1', 'number', 'Días antes de vencer para enviar notificación'),
        ('monto_multa_por_dia', '5000', 'number', 'Monto de multa por día de retraso'),
        ('max_prestamos_simultaneos', '3', 'number', 'Máximo de préstamos simultáneos por usuario'),
        ('dias_maximo_prestamo', '7', 'number', 'Días máximos de duración de préstamo'),
        ('habilitar_multas', 'true', 'boolean', 'Habilitar sistema de multas'),
        ('habilitar_reservas', 'true', 'boolean', 'Habilitar sistema de reservas')
      `);
    } catch (error) {
      // Las configuraciones ya existen, ignorar
    }

    // Agregar columna deleted_at para soft delete en recursos
    try {
      await connection.query(`
        ALTER TABLE recursos 
        ADD COLUMN deleted_at DATETIME NULL
      `);
    } catch (error) {
      // La columna ya existe, ignorar
      if (!error.message.includes('Duplicate column name')) {
        console.warn('Advertencia al agregar columna deleted_at:', error.message);
      }
    }

    // Agregar columna limite_prestamos_simultaneos en usuarios
    try {
      await connection.query(`
        ALTER TABLE usuarios 
        ADD COLUMN limite_prestamos_simultaneos INT DEFAULT 3
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        console.warn('Advertencia al agregar columna limite_prestamos_simultaneos:', error.message);
      }
    }

    connection.release();
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

export default pool;

