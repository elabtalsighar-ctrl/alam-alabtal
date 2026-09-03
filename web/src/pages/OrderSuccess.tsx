import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatPrice, formatDate } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { trackPurchase } from '../lib/pixel';
import type { CartItem, Order } from '../lib/types';

interface OrderData {
  order_number: string;
  customer_name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  items_total: number;
  delivery_cost: number;
  total: number;
  created_at?: string;
  items: CartItem[];
}

export default function OrderSuccess() {
  const location = useLocation();
  const state = (location.state || {}) as { order?: OrderData };
  const { settings } = useSettings();

  useEffect(() => {
    if (state.order && window.fbq && settings?.facebook_pixel_id) {
      trackPurchase({
        value: state.order.total,
        order_number: state.order.order_number,
        contents: state.order.items.map(i => ({
          id: String(i.product_id),
          quantity: i.quantity,
          item_price: i.price
        }))
      });
    }
  }, [state.order]);

  if (!state.order) {
    return (
      <div className="container-px max-w-2xl py-16">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-card">
          <span className="text-6xl" aria-hidden="true">🎉</span>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">تم تسجيل طلبك بنجاح!</h1>
          <p className="mt-2 text-lg font-bold text-brand-600">شكراً لثقتك في عالم الأبطال الصغار ❤️</p>
          <p className="mt-2 text-slate-600">سنتواصل معك هاتفياً لتأكيد الطلب.</p>
          <Link to="/" className="btn-primary mt-8">العودة إلى المتجر</Link>
        </div>
      </div>
    );
  }

  const o = state.order;

  return (
    <div className="container-px max-w-2xl py-16">
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-card">
        <span className="text-6xl" aria-hidden="true">🎉</span>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">تم تسجيل طلبك بنجاح!</h1>
        <p className="mt-2 text-lg font-bold text-brand-600">شكراً لثقتك في عالم الأبطال الصغار ❤️</p>
        <p className="mt-2 text-slate-600">سنتواصل معك هاتفياً لتأكيد الطلب.</p>

        <div className="mt-8 space-y-4 text-right">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 border-t border-slate-100 pt-5">
            <div>
              <p className="text-xs text-slate-500">رقم الطلب</p>
              <p className="font-extrabold text-slate-800">{o.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">الدفع</p>
              <p className="font-bold text-mint-600">عند الاستلام</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 text-right">
            <h2 className="mb-3 font-extrabold text-slate-800">المنتجات</h2>
            <div className="space-y-3">
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3">
                  {it.image && <img src={it.image} alt={it.name} className="h-12 w-12 rounded-lg object-cover" />}
                  <div className="flex-1 text-right">
                    <p className="text-sm font-bold text-slate-800">{it.name}</p>
                    {it.selected_size && <p className="text-xs font-bold text-brand-600">المقاس: {it.selected_size}</p>}
                    <p className="text-xs text-slate-500">الكمية: {it.quantity}</p>
                  </div>
                  <span className="text-sm font-bold">{formatPrice(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي</span><span className="font-bold">{formatPrice(o.items_total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>التوصيل</span><span className="font-bold">{o.delivery_cost === 0 ? 'مجاني' : formatPrice(o.delivery_cost)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-800">
                <span>الإجمالي</span><span>{formatPrice(o.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 text-right">
            <h2 className="mb-2 font-extrabold text-slate-800">معلومات التوصيل</h2>
            <p className="text-sm text-slate-600">الاسم: {o.customer_name}</p>
            <p className="text-sm text-slate-600" dir="ltr" style={{ textAlign: 'right' }}>الهاتف: {o.phone}</p>
            <p className="text-sm text-slate-600">الولاية: {o.wilaya}</p>
            <p className="text-sm text-slate-600">البلدية: {o.commune}</p>
            <p className="text-sm text-slate-600">العنوان: {o.address}</p>
          </div>
        </div>

        <Link to="/" className="btn-primary mt-8">العودة إلى المتجر</Link>
      </div>
    </div>
  );
}
