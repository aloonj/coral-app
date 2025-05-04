import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import './utils/googleAuthFix'; // Import Google Auth Fix for automatic callback retries
import LayoutWithThemeToggle from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Corals from './pages/Corals';
import StockLevels from './pages/StockLevels';
import QuickOrder from './pages/QuickOrder';
import Login from './pages/Login';
import LoginSuccess from './pages/LoginSuccess';
import Register from './pages/Register';
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
import XeroAdmin from './pages/XeroAdmin';
import XeroVerification from './pages/XeroVerification';

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
        <CartProvider>
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
            <Route 
              path="/corals/stock-levels" 
              element={
                <ProtectedRoute requireAdmin>
                  <StockLevels />
                </ProtectedRoute>
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/login/success" element={<LoginSuccess />} />
            <Route path="/register" element={<Register />} />
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
              path="/xero-admin"
              element={
                <ProtectedRoute requireAdmin>
                  <XeroAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/xero-verification"
              element={
                <ProtectedRoute requireAdmin>
                  <XeroVerification />
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
            {/* Catch-all route for unknown paths */}
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
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
