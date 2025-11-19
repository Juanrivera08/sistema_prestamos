import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recursos from './pages/Recursos';
import Usuarios from './pages/Usuarios';
import Prestamos from './pages/Prestamos';
import Reservas from './pages/Reservas';
import Multas from './pages/Multas';
import Historial from './pages/Historial';
import Calendario from './pages/Calendario';
import Informes from './pages/Informes';
import Layout from './components/Layout';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="recursos" element={<Recursos />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="prestamos" element={<Prestamos />} />
              <Route path="reservas" element={<Reservas />} />
              <Route path="multas" element={<Multas />} />
              <Route path="historial" element={<Historial />} />
              <Route path="historial/:tipo/:id" element={<Historial />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="informes" element={<Informes />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

