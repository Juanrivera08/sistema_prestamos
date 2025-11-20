import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { initDatabase } from './backend/config/database.js';

// Importar rutas
import authRoutes from './backend/routes/authRoutes.js';
import recursosRoutes from './backend/routes/recursosRoutes.js';
import usuariosRoutes from './backend/routes/usuariosRoutes.js';
import prestamosRoutes from './backend/routes/prestamosRoutes.js';
import informesRoutes from './backend/routes/informesRoutes.js';
import reservasRoutes from './backend/routes/reservasRoutes.js';
import notificacionesRoutes from './backend/routes/notificacionesRoutes.js';
import multasRoutes from './backend/routes/multasRoutes.js';
import historialRoutes from './backend/routes/historialRoutes.js';

dotenv.config();

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET no está definido en las variables de entorno');
  console.error('Por favor, crea un archivo .env con JWT_SECRET configurado');
  process.exit(1);
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS debe estar PRIMERO, antes de otros middlewares
// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // En producción, permitir cualquier origen de Railway
    if (process.env.RAILWAY_ENVIRONMENT || origin.includes('railway.app') || origin.includes('up.railway.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// Middlewares de seguridad (después de CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Deshabilitar CSP para desarrollo
}));

// Rate limiting para prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por ventana
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No aplicar rate limiting a /api/auth/me (se llama frecuentemente)
    const path = req.path || req.originalUrl || '';
    return path.includes('/api/auth/me');
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 intentos por ventana
  message: 'Demasiados intentos de inicio de sesión, intenta de nuevo más tarde.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting a rutas específicas
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Aplicar limiter general a todas las rutas /api/ (excepto las excluidas en skip)
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/recursos', recursosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/informes', informesRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/multas', multasRoutes);
app.use('/api/historial', historialRoutes);

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ message: 'API del Sistema de Préstamos funcionando' });
});

// Servir archivos estáticos del frontend (si existe la carpeta dist)
const frontendDistPath = join(__dirname, 'frontend/dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  
  // Todas las rutas que no sean /api/* deben servir el index.html del frontend
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(frontendDistPath, 'index.html'));
    }
  });
}

// Ruta 404 para rutas API no encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    message: 'Ruta API no encontrada',
    path: req.originalUrl
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Error interno del servidor',
    error: err.message
  });
});

// Inicializar base de datos y luego iniciar servidor
initDatabase()
  .then(async () => {
    // Importar tareas programadas antes de iniciar el servidor
    const { ejecutarTareasProgramadas } = await import('./backend/utils/cronJobs.js');
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
      
      // Ejecutar inmediatamente
      ejecutarTareasProgramadas();
      
      // Ejecutar cada hora
      setInterval(() => {
        ejecutarTareasProgramadas();
      }, 60 * 60 * 1000); // 1 hora
      
      console.log('Tareas programadas configuradas (cada hora)');
    });
  })
  .catch((error) => {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  });

