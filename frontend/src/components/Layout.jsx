import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
  const { user, logout, isAdmin, isTrabajador } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Recursos', path: '/recursos', icon: '💻' },
    { name: 'Préstamos', path: '/prestamos', icon: '📋' },
    ...(isTrabajador ? [{ name: 'Usuarios', path: '/usuarios', icon: '👥' }] : []),
    { name: 'Informes', path: '/informes', icon: '📈' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  Sistema de Préstamos
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'border-primary-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
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
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.nombre_completo}
                </span>
                <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full">
                  {user?.rol}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
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
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

