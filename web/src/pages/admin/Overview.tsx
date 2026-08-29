import { useEffect, useState } from 'react';
import { api, formatPrice, formatDate } from '../../lib/api';
import type { Stats, Order } from '../../lib/types';
import { PageLoader } from '../../components/ui';
import { useSEO } from '../../lib/seo';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700'
};

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  useSEO({ title: 'Overview | Admin' });

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <PageLoader label="Loading dashboard..." />;

  const cards = [
    { label: 'Total Sales', value: formatPrice(stats.totalSales), color: 'from-brand-500 to-brand-600', icon: '💰' },
    { label: 'Total Orders', value: stats.totalOrders, color: 'from-sun-400 to-sun-500', icon: '📦' },
    { label: 'New Orders', value: stats.newOrders, color: 'from-blue-400 to-blue-500', icon: '🆕' },
    { label: 'Delivered', value: stats.delivered, color: 'from-emerald-400 to-emerald-500', icon: '✅' },
    { label: 'Cancelled', value: stats.cancelled, color: 'from-red-400 to-red-500', icon: '❌' },
    { label: 'Products', value: stats.totalProducts, color: 'from-purple-400 to-purple-500', icon: '🎁' },
    { label: 'Low Stock', value: stats.lowStock, color: 'from-orange-400 to-orange-500', icon: '⚠️' }
  ];

  const maxDay = Math.max(1, ...stats.salesByDay.map(d => d.total));
  const days = [...stats.salesByDay].reverse();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Dashboard Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl bg-gradient-to-br ${c.color} p-5 text-white shadow-card`}>
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 text-xl font-extrabold sm:text-2xl">{c.value}</p>
            <p className="text-sm opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Sales chart */}
        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold text-slate-800">Sales (last 10 days)</h2>
          {stats.salesByDay.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No sales yet.</p>
          ) : (
            <div className="flex h-48 items-end gap-2">
              {days.map(d => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-600">{Math.round(d.total).toLocaleString('en')}</span>
                  <div
                    className="w-full rounded-t-lg bg-brand-500 transition-all"
                    style={{ height: `${Math.max(4, (d.total / maxDay) * 130)}px` }}
                    title={`${d.day}: ${formatPrice(d.total)}`}
                  />
                  <span className="text-[10px] text-slate-400">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="mb-4 font-extrabold text-slate-800">Recent Orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.slice(0, 6).map((o: Order) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{o.order_number}</p>
                    <p className="text-xs text-slate-500">{o.customer_name} • {formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold">{formatPrice(o.total)}</span>
                    <span className={`badge ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
