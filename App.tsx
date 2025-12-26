
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import FirebaseGuard from './components/common/FirebaseGuard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Storefront from './pages/Storefront';
import CartPage from './pages/CartPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
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
