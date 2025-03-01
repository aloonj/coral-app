import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LayoutWithThemeToggle from './components/Layout/LayoutWithThemeToggle';
import Dashboard from './pages/Dashboard';
import Corals from './pages/Corals';
import QuickOrder from './pages/QuickOrder';
import Login from './pages/Login';
import EditCoral from './pages/EditCoral';
import AddCoral from './pages/AddCoral';
import Orders from './pages/Orders';
import Clients from './pages/Clients';
import ClientOrders from './pages/ClientOrders';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import ImageManagement from './pages/ImageManagement';
import Notifications from './pages/Notifications';
import Backups from './pages/Backups';
import ThemeGuide from './components/ThemeGuide';
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to="/dashboard" replace />;
};

const ProtectedRoute = ({ children, requireAdmin, requireClient }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') return <Navigate to="/dashboard" />;
  if (requireClient && user.role !== 'CLIENT') return <Navigate to="/dashboard" />;
  
  
  return children;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LayoutWithThemeToggle>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RootRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/quickorder"
              element={
                <ProtectedRoute>
                  <QuickOrder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/corals" 
              element={
                <ProtectedRoute requireAdmin>
                  <Corals />
                </ProtectedRoute>
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/corals/add" 
              element={
                <ProtectedRoute requireAdmin>
                  <AddCoral />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/corals/:id/edit" 
              element={
                <ProtectedRoute requireAdmin>
                  <EditCoral />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute requireAdmin>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute requireAdmin>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-orders"
              element={
                <ProtectedRoute requireClient>
                  <ClientOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/image-management"
              element={
                <ProtectedRoute requireAdmin>
                  <ImageManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute requireAdmin>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backups"
              element={
                <ProtectedRoute requireAdmin>
                  <Backups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/theme-guide"
              element={
                <ProtectedRoute requireAdmin>
                  <ThemeGuide />
                </ProtectedRoute>
              }
            />
            {/* Catch-all route for unknown paths (including /register) */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <RootRedirect />
                </ProtectedRoute>
              }
            />
          </Routes>
        </LayoutWithThemeToggle>
      </AuthProvider>
    </Router>
  );
}

export default App;
