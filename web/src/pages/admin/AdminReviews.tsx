import { useCallback, useEffect, useState } from 'react';
import { api, formatDate } from '../../lib/api';
import type { Review, Product } from '../../lib/types';
import { PageLoader, Modal, Stars } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useSEO } from '../../lib/seo';
import { TrashIcon } from '../../components/icons';

interface FormState {
  customer_name: string; rating: number; comment: string; product_id: string;
  verified: boolean; approved: boolean;
}

const emptyForm: FormState = { customer_name: '', rating: 5, comment: '', product_id: '', verified: false, approved: true };

export default function AdminReviews() {
  useSEO({ title: 'Reviews | Admin' });
  const { notify } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([api.reviews(), api.products('?includeDisabled=1')]);
      setReviews(r); setProducts(p);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<any>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : k === 'rating' ? Number(e.target.value) : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: Review) => {
    setEditing(r);
    setForm({ customer_name: r.customer_name, rating: r.rating, comment: r.comment, product_id: r.product_id ? String(r.product_id) : '', verified: !!r.verified, approved: !!r.approved });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { customer_name: form.customer_name, rating: form.rating, comment: form.comment, product_id: form.product_id ? Number(form.product_id) : null, verified: form.verified, approved: form.approved };
      if (editing) { await api.updateReview(editing.id, payload); notify('Review updated'); }
      else { await api.createReview(payload); notify('Review created (pending approval)'); }
      setOpen(false); load();
    } catch (err: any) { notify(err.message, 'error'); } finally { setSaving(false); }
  };

  const toggleApprove = async (r: Review) => {
    try { await api.updateReview(r.id, { approved: r.approved ? 0 : 1 }); load(); }
    catch (err: any) { notify(err.message, 'error'); }
  };

  const toggleVerify = async (r: Review) => {
    try { await api.updateReview(r.id, { verified: r.verified ? 0 : 1 }); load(); }
    catch (err: any) { notify(err.message, 'error'); }
  };

  const remove = async (r: Review) => {
    if (!confirm('Delete this review?')) return;
    try { await api.deleteReview(r.id); notify('Deleted'); load(); }
    catch (err: any) { notify(err.message, 'error'); }
  };

  if (loading) return <PageLoader label="Loading reviews..." />;

  const pending = reviews.filter(r => !r.approved).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Reviews ({reviews.length})</h1>
        <button onClick={openCreate} className="btn-primary">Add Review</button>
      </div>

      {pending > 0 && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
          {pending} review(s) awaiting approval.
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-slate-400">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="rounded-2xl bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800">{r.customer_name}</span>
                    {r.verified ? <span className="badge bg-emerald-100 text-emerald-700">✓ Verified</span> : null}
                    {!r.approved && <span className="badge bg-amber-100 text-amber-700">Pending</span>}
                  </div>
                  <div className="mt-1"><Stars rating={r.rating} size={14} /></div>
                </div>
                <span className="text-xs text-slate-400">{r.product_name || 'General'} • {formatDate(r.created_at)}</span>
                <div className="flex gap-2">
                  <button onClick={() => toggleApprove(r)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${r.approved ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                    {r.approved ? 'Unapprove' : 'Approve'}
                  </button>
                  <button onClick={() => toggleVerify(r)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Verify</button>
                  <button onClick={() => openEdit(r)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Edit</button>
                  <button onClick={() => remove(r)} className="flex items-center rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"><TrashIcon size={14} /></button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Review' : 'Add Review'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Customer name *</label><input className="input-field" value={form.customer_name} onChange={set('customer_name')} required /></div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Rating (1-5)</label>
            <input className="input-field" type="number" min="1" max="5" value={form.rating} onChange={set('rating')} required />
          </div>
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Comment *</label><textarea className="input-field" rows={3} value={form.comment} onChange={set('comment')} required /></div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Product (optional)</label>
            <select className="input-field" value={form.product_id} onChange={set('product_id')}>
              <option value="">General review</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.verified} onChange={set('verified')} className="h-4 w-4 accent-brand-600" /> Verified purchase</label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.approved} onChange={set('approved')} className="h-4 w-4 accent-brand-600" /> Approved</label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
