import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import FloatingButtons from './FloatingButtons';
import { useSettings } from '../context/SettingsContext';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);
  return null;
}

function FacebookPixel() {
  const { settings } = useSettings();
  const pixelId = settings?.facebook_pixel_id?.trim();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pixelId || window.fbq) return;

    window._fbq = window._fbq || [];
    const fbqFn: any = function() {
      fbqFn.callMethod ? fbqFn.callMethod.apply(fbqFn, arguments) : fbqFn.queue.push(arguments);
    };
    fbqFn.queue = [];
    window.fbq = fbqFn;

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.async = true;
    document.head.appendChild(script);

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }, [pixelId]);

  useEffect(() => {
    if (!pixelId || !window.fbq) return;
    window.fbq('track', 'PageView');
  }, [pathname, pixelId]);

  return null;
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <FacebookPixel />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <FloatingButtons />
    </div>
  );
}
