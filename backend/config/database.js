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
        fecha_prestamo DATE NOT NULL,
        fecha_devolucion_prevista DATE NOT NULL,
        fecha_devolucion_real DATE,
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

    connection.release();
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

export default pool;

