import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import About from './pages/About';
import Contact from './pages/Contact';
import Faq from './pages/Faq';
import { Privacy, Terms, Returns } from './pages/Policy';

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Overview = lazy(() => import('./pages/admin/Overview'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettings'));

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Storefront */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/returns" element={<Returns />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<Suspense fallback={<Fallback />}><AdminLogin /></Suspense>} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<Fallback />}>
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            </Suspense>
          }
        >
          <Route index element={<Suspense fallback={<Fallback />}><Overview /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<Fallback />}><AdminProducts /></Suspense>} />
          <Route path="categories" element={<Suspense fallback={<Fallback />}><AdminCategories /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<Fallback />}><AdminOrders /></Suspense>} />
          <Route path="customers" element={<Suspense fallback={<Fallback />}><AdminCustomers /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<Fallback />}><AdminReviews /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<Fallback />}><AdminSettingsPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

function Fallback() {
  return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
