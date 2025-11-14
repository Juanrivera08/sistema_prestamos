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
        rol ENUM('administrador', 'usuario') DEFAULT 'usuario',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de recursos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recursos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado ENUM('disponible', 'prestado', 'mantenimiento') DEFAULT 'disponible',
        ubicacion VARCHAR(255),
        imagen VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de préstamos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prestamos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        recurso_id INT NOT NULL,
        fecha_prestamo DATE NOT NULL,
        fecha_devolucion_prevista DATE NOT NULL,
        fecha_devolucion_real DATE,
        estado ENUM('activo', 'devuelto', 'vencido') DEFAULT 'activo',
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
        INDEX idx_usuario (usuario_id),
        INDEX idx_recurso (recurso_id),
        INDEX idx_estado (estado)
      )
    `);

    // Crear usuario administrador por defecto si no existe
    const [adminExists] = await connection.query(
      'SELECT id FROM usuarios WHERE email = ?',
      ['admin@sistema.com']
    );

    if (adminExists.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      await connection.query(
        `INSERT INTO usuarios (codigo, nombre_completo, email, password, rol) 
         VALUES (?, ?, ?, ?, ?)`,
        ['ADMIN001', 'Administrador', 'admin@sistema.com', hashedPassword, 'administrador']
      );
      console.log('Usuario administrador creado: admin@sistema.com / admin123');
    }

    connection.release();
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

export default pool;

