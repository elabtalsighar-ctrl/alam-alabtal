import { useCallback, useEffect, useState } from 'react';
import { api, formatPrice, formatDate } from '../../lib/api';
import type { Customer } from '../../lib/types';
import { PageLoader, Modal } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useSEO } from '../../lib/seo';
import { ChevronDownIcon } from '../../components/icons';
import { WILAYAS, validateAlgerianPhone } from '../../lib/utils';

export default function AdminCustomers() {
  useSEO({ title: 'Customers | Admin' });
  const { notify } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', wilaya: '', commune: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setCustomers(await api.customers()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.wilaya || !form.commune.trim()) {
      notify('الرجاء ملء الاسم، الهاتف، الولاية والبلدية', 'error');
      return;
    }
    if (!validateAlgerianPhone(form.phone)) {
      notify('رقم الهاتف غير صحيح', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.createCustomer({ name: form.name.trim(), phone: form.phone.trim(), wilaya: form.wilaya, commune: form.commune.trim(), address: form.address.trim() });
      notify('تم إضافة الزبون');
      setOpen(false);
      setForm({ name: '', phone: '', wilaya: '', commune: '', address: '' });
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading customers..." />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Customers ({customers.length})</h1>
        <button onClick={() => setOpen(true)} className="btn-primary text-sm">+ إضافة زبون</button>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-slate-400">No customers yet.</div>
      ) : (
        <div className="space-y-3">
          {customers.map(c => (
            <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-soft">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex w-full flex-wrap items-center gap-3 p-4 text-right hover:bg-slate-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-extrabold text-brand-700">
                  {c.name.charAt(0)}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500" dir="ltr" style={{ textAlign: 'right' }}>{c.phone}</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400">Orders</span>
                  <span className="font-bold text-slate-700">{c.order_count}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400">Spent</span>
                  <span className="font-bold text-slate-700">{formatPrice(c.total_spent)}</span>
                </div>
                <ChevronDownIcon className={`text-slate-400 transition-transform ${expanded === c.id ? 'rotate-180' : ''}`} />
              </button>

              {expanded === c.id && (
                <div className="border-t border-slate-100 p-4">
                  <dl className="mb-4 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="flex gap-2"><dt className="w-20 font-bold">Wilaya</dt><dd>{c.wilaya || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="w-20 font-bold">Commune</dt><dd>{c.commune || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="w-20 font-bold">Address</dt><dd>{c.address || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="w-20 font-bold">Joined</dt><dd>{formatDate(c.created_at)}</dd></div>
                  </dl>

                  <h3 className="mb-2 text-sm font-extrabold text-slate-700">Order history</h3>
                  {c.orders.length === 0 ? (
                    <p className="text-sm text-slate-400">No orders.</p>
                  ) : (
                    <div className="space-y-2">
                      {c.orders.map(o => (
                        <div key={o.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">{o.order_number}</span>
                            <span className="font-extrabold text-slate-800">{formatPrice(o.total)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                            <span>{formatDate(o.created_at)}</span>
                            <span>{o.items.length} items</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة زبون جديد">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">الاسم الكامل *</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: أحمد بن علي" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">رقم الهاتف *</label>
            <input className="input-field" dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0796389228" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">الولاية *</label>
            <select className="input-field" value={form.wilaya} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))} required>
              <option value="">اختر الولاية</option>
              {WILAYAS.map(w => <option key={w.code} value={`${w.code} - ${w.name}`}>{w.code} - {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">البلدية *</label>
            <input className="input-field" value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))} placeholder="مثال: باب الزوار" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">العنوان (اختياري)</label>
            <input className="input-field" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="الحي، الشارع..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'جارٍ الحفظ...' : 'حفظ الزبون'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
