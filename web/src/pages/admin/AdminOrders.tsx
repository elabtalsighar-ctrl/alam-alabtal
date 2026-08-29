import { useCallback, useEffect, useState } from 'react';
import { api, formatPrice, formatDate } from '../../lib/api';
import type { Order } from '../../lib/types';
import { PageLoader } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useSEO } from '../../lib/seo';
import { ChevronDownIcon } from '../../components/icons';

const STATUSES = ['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700'
};
const STATUS_AR: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', preparing: 'قيد التحضير', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي'
};

export default function AdminOrders() {
  useSEO({ title: 'Orders | Admin' });
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [changing, setChanging] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setOrders(await api.orders(filter || undefined)); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, filter]);

  const changeStatus = async (order: Order, status: string) => {
    setChanging(order.id);
    try {
      await api.updateOrder(order.id, status);
      notify(STATUS_AR[status] || status);
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setChanging(null);
    }
  };

  const pushEcotrack = async (order: Order) => {
    setChanging(order.id);
    try {
      const token = localStorage.getItem('admin_token');
      const r = await fetch(`/api/orders/${order.id}/push-ecotrack`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'فشل');
      notify('تم رفع الطلب إلى Ecotrack: ' + (j.tracking || j.ecotrack_id || 'تم'));
      load();
    } catch (err: any) {
      notify(err.message || 'فشل الرفع', 'error');
    } finally {
      setChanging(null);
    }
  };

  if (loading) return <PageLoader label="Loading orders..." />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Orders ({orders.length})</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterBtn active={filter === ''} onClick={() => setFilter('')}>All</FilterBtn>
        {STATUSES.map(s => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_AR[s]} ({countByStatus(s)})</FilterBtn>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-slate-400">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="overflow-hidden rounded-2xl bg-white shadow-soft">
              <button
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="flex w-full flex-wrap items-center gap-3 p-4 text-right hover:bg-slate-50"
                aria-expanded={expanded === o.id}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-extrabold text-brand-700`}>
                  {o.id}
                </span>
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm font-bold text-slate-800">{o.order_number}</p>
                  <p className="text-xs text-slate-500">{o.customer_name}</p>
                </div>
                <div className="hidden text-sm text-slate-500 sm:block">{formatDate(o.created_at)}</div>
                <div className="text-sm font-extrabold text-slate-800">{formatPrice(o.total)}</div>
                <span className={`badge ${STATUS_COLORS[o.status]}`}>{STATUS_AR[o.status]}</span>
                <ChevronDownIcon className={`text-slate-400 transition-transform ${expanded === o.id ? 'rotate-180' : ''}`} />
              </button>

              {expanded === o.id && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-extrabold text-slate-700">Customer</h3>
                      <dl className="space-y-1 text-sm text-slate-600">
                        <div className="flex gap-2"><dt className="w-20 font-bold">Name</dt><dd>{o.customer_name}</dd></div>
                        <div className="flex gap-2"><dt className="w-20 font-bold">Phone</dt><dd dir="ltr">{o.phone}</dd></div>
                        <div className="flex gap-2"><dt className="w-20 font-bold">Wilaya</dt><dd>{o.wilaya}</dd></div>
                        <div className="flex gap-2"><dt className="w-20 font-bold">Commune</dt><dd>{o.commune}</dd></div>
                        <div className="flex gap-2"><dt className="w-20 font-bold">Address</dt><dd>{o.address}</dd></div>
                        <div className="flex gap-2"><dt className="w-20 font-bold">Delivery</dt><dd>{(o as any).stop_desk ? 'إلى المكتب 📦' : 'إلى المنزل 🏠'}</dd></div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-extrabold text-slate-700">Items</h3>
                      <div className="space-y-2">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm">
                            <span className="text-slate-700">{it.product_name} × {it.quantity}</span>
                            <span className="font-bold text-slate-800">{formatPrice(it.unit_price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-sm">
                        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatPrice(o.items_total)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>Delivery</span><span>{o.delivery_cost === 0 ? 'Free' : formatPrice(o.delivery_cost)}</span></div>
                        <div className="flex justify-between font-extrabold text-slate-800"><span>Total</span><span>{formatPrice(o.total)}</span></div>
                      </div>
                    </div>
                  </div>

                  {(o as any).ecotrack_tracking || (o as any).ecotrack_id ? (
                    <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm">
                      <span className="font-bold text-emerald-700">Ecotrack:</span> {(o as any).ecotrack_tracking || (o as any).ecotrack_id}
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <button onClick={() => pushEcotrack(o)} disabled={changing === o.id} className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                      رفع إلى Ecotrack يدوياً
                    </button>
                  </div>
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-extrabold text-slate-700">Change status</h3>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          disabled={changing === o.id || o.status === s}
                          onClick={() => changeStatus(o, s)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${o.status === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {STATUS_AR[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function countByStatus(s: string) {
    return orders.filter(o => o.status === s).length;
  }
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 shadow-soft hover:bg-slate-50'}`}>
      {children}
    </button>
  );
}
