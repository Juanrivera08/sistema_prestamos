import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recursos from './pages/Recursos';
import Usuarios from './pages/Usuarios';
import Prestamos from './pages/Prestamos';
import Informes from './pages/Informes';
import Layout from './components/Layout';

function App() {
  return (
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
            <Route path="informes" element={<Informes />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

