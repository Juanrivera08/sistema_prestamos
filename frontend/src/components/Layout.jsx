import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Notificaciones from './Notificaciones';

const Layout = () => {
  const { user, logout, isAdmin, isTrabajador, isEstudiante } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Menú principal - elementos más usados
  const mainNavigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Recursos', path: '/recursos', icon: '💻' },
    ...(isEstudiante ? [] : [
      { name: 'Reservas', path: '/reservas', icon: '📅' },
    ]),
    { name: 'Préstamos', path: '/prestamos', icon: '📋' },
  ];

  // Menú secundario - elementos menos frecuentes
  const secondaryNavigation = [
    ...(isTrabajador ? [{ name: 'Usuarios', path: '/usuarios', icon: '👥' }] : []),
    { name: 'Historial', path: '/historial', icon: '📜' },
    ...(isEstudiante ? [] : [
      { name: 'Calendario', path: '/calendario', icon: '📅' },
      { name: 'Informes', path: '/informes', icon: '📈' },
    ]),
    { name: 'Documentación', path: '/documentacion', icon: '📚' },
  ];

  const allNavigation = [...mainNavigation, ...secondaryNavigation];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo y menú principal */}
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                  Sistema de Préstamos
                </h1>
              </div>
              
              {/* Menú principal - Desktop */}
              <div className="hidden md:ml-4 lg:ml-6 md:flex md:space-x-1 lg:space-x-2">
                {mainNavigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-2 lg:px-3 py-1 border-b-2 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive(item.path)
                        ? 'border-primary-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    <span className="hidden lg:inline">{item.name}</span>
                  </Link>
                ))}
                
                {/* Menú desplegable "Más" */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`inline-flex items-center px-2 lg:px-3 py-1 border-b-2 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                      secondaryNavigation.some(item => isActive(item.path))
                        ? 'border-primary-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="mr-1">⋯</span>
                    <span className="hidden lg:inline">Más</span>
                  </button>
                  
                  {showMoreMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowMoreMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                        {secondaryNavigation.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setShowMoreMenu(false)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              isActive(item.path)
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="mr-2">{item.icon}</span>
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Usuario y acciones - Desktop */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
              <Notificaciones />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleDarkMode();
                }}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                type="button"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-xs lg:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                  {user?.nombre_completo}
                </span>
                <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full whitespace-nowrap">
                  {user?.rol}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-xs lg:text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors whitespace-nowrap"
              >
                Salir
              </button>
            </div>

            {/* Botón menú móvil */}
            <div className="md:hidden flex items-center space-x-2">
              <Notificaciones />
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {showMobileMenu ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="pt-2 pb-3 space-y-1">
              {allNavigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{user?.nombre_completo}</span>
                  <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full">
                    {user?.rol}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    logout();
                  }}
                  className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors py-2"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

