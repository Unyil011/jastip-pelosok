import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import ThemeToggle from './components/ThemeToggle';

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
 * Header Global Bar: Brand & Theme Toggle Switcher
 */
function TopHeader() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '12px 16px 0 16px',
        maxWidth: '480px',
        margin: '0 auto',
        width: '100%',
        zIndex: 10,
      }}
    >
      <ThemeToggle />
    </div>
  );
}

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
    if (profile.role === 'customer') return <Navigate to="/dashboard-customer" replace />;
    if (profile.role === 'kurir') return <Navigate to="/dashboard-kurir" replace />;
    if (profile.role === 'admin') return <Navigate to="/dashboard-admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TopHeader />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register-customer" element={<Navigate to="/login" replace />} />
            <Route path="/register-kurir" element={<Navigate to="/login" replace />} />

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
    </ThemeProvider>
  );
}
