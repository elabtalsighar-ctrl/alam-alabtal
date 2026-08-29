import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Category } from '../../lib/types';
import { PageLoader, Modal, ImageWithFallback } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useSEO } from '../../lib/seo';
import { TrashIcon, PlusIcon } from '../../components/icons';

export default function AdminCategories() {
  useSEO({ title: 'Categories | Admin' });
  const { notify } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', image: '', sort_order: '0', enabled: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setCategories(await api.categories(true)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', image: '', sort_order: '0', enabled: true }); setOpen(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '', image: c.image || '', sort_order: String(c.sort_order || 0), enabled: !!c.enabled });
    setOpen(true);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const r = await api.upload(file); setForm(f => ({ ...f, image: r.url })); notify('تم رفع الصورة'); }
    catch (err: any) { notify(err.message, 'error'); }
    e.target.value = '';
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description, image: form.image, sort_order: Number(form.sort_order), enabled: form.enabled };
      if (editing) { await api.updateCategory(editing.id, payload); notify('Category updated'); }
      else { await api.createCategory(payload); notify('Category created'); }
      setOpen(false); load();
    } catch (err: any) { notify(err.message, 'error'); } finally { setSaving(false); }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try { await api.deleteCategory(c.id); notify('Deleted'); load(); }
    catch (err: any) { notify(err.message, 'error'); }
  };

  if (loading) return <PageLoader label="Loading categories..." />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Categories ({categories.length})</h1>
        <button onClick={openCreate} className="btn-primary"><PlusIcon size={18} /> Add Category</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(c => (
          <div key={c.id} className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <ImageWithFallback src={c.image} alt={c.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-extrabold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{c.slug}</p>
              </div>
              <span className={`badge ${c.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {c.enabled ? 'On' : 'Off'}
              </span>
            </div>
            {c.description && <p className="mt-2 text-xs text-slate-500">{c.description}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(c)} className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Edit</button>
              <button onClick={() => remove(c)} className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"><TrashIcon size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-3">
            {form.image && <ImageWithFallback src={form.image} alt="" className="h-16 w-16 rounded-xl object-cover" />}
            <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm font-bold text-slate-400 hover:border-brand-400 hover:text-brand-500">
              Upload image
              <input type="file" accept="image/*" onChange={upload} className="hidden" />
            </label>
          </div>
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Name *</label><input className="input-field" value={form.name} onChange={set('name')} required /></div>
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Description</label><textarea className="input-field" rows={2} value={form.description} onChange={set('description')} /></div>
          <div><label className="mb-1 block text-xs font-bold text-slate-600">Sort order</label><input className="input-field" type="number" value={form.sort_order} onChange={set('sort_order')} /></div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.enabled} onChange={set('enabled')} className="h-4 w-4 accent-brand-600" /> Enabled
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
