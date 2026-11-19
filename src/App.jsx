import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pages
import Login from './pages/Login';
import RegisterCustomer from './pages/RegisterCustomer';
import RegisterKurir from './pages/RegisterKurir';
import DashboardCustomer from './pages/DashboardCustomer';
import CreateOrder from './pages/CreateOrder';
import OrderHistory from './pages/OrderHistory';
import DashboardKurir from './pages/DashboardKurir';
import DashboardAdmin from './pages/DashboardAdmin';
import SkeletonLoader from './components/SkeletonLoader';

/**
 * Route Guard Berbasis Role
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { profile, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <SkeletonLoader type="card" height="150px" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    // Jika role tidak diizinkan, kembalikan ke dashboard yang sesuai
    if (profile.role === 'customer') return <Navigate to="/dashboard-customer" replace />;
    if (profile.role === 'kurir') return <Navigate to="/dashboard-kurir" replace />;
    if (profile.role === 'admin') return <Navigate to="/dashboard-admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register-customer" element={<RegisterCustomer />} />
          <Route path="/register-kurir" element={<RegisterKurir />} />

          {/* Customer Routes */}
          <Route
            path="/dashboard-customer"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <DashboardCustomer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buat-order"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CreateOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/riwayat-order"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <OrderHistory />
              </ProtectedRoute>
            }
          />

          {/* Kurir Routes */}
          <Route
            path="/dashboard-kurir"
            element={
              <ProtectedRoute allowedRoles={['kurir']}>
                <DashboardKurir />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/dashboard-admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
