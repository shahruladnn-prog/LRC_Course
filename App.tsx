
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import FirebaseGuard from './components/common/FirebaseGuard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Storefront from './pages/Storefront';
import CartPage from './pages/CartPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import ContentPage from './pages/ContentPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

const App: React.FC = () => {
  return (
    <FirebaseGuard>
      <AuthProvider>
        <CartProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Storefront />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/confirmation" element={<OrderConfirmationPage />} />
              <Route path="/privacy" element={<ContentPage type="privacy" />} />
              <Route path="/terms" element={<ContentPage type="terms" />} />
              <Route path="/contact" element={<ContentPage type="contact" />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </HashRouter>
        </CartProvider>
      </AuthProvider>
    </FirebaseGuard>
  );
};

export default App;
