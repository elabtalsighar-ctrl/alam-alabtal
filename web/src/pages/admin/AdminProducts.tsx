import { useCallback, useEffect, useState } from 'react';
import { api, formatPrice } from '../../lib/api';
import type { Product, Category } from '../../lib/types';
import { PageLoader, Modal, ImageWithFallback } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useSEO } from '../../lib/seo';
import { TrashIcon, PlusIcon } from '../../components/icons';

interface FormState {
  name: string; short_description: string; description: string;
  price: string; old_price: string; stock: string; category_id: string;
  recommended_age: string; keywords: string;
  is_new: boolean; is_bestseller: boolean; is_featured: boolean; enabled: boolean;
  features: string; specifications: string; sizes: string;
  image: string; images: string[];
}

const emptyForm: FormState = {
  name: '', short_description: '', description: '', price: '', old_price: '', stock: '0',
  category_id: '', recommended_age: '', keywords: '', is_new: false, is_bestseller: false,
  is_featured: false, enabled: true, features: '', specifications: '', sizes: '', image: '', images: []
};

export default function AdminProducts() {
  useSEO({ title: 'Products | Admin' });
  const { notify } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.products('?includeDisabled=1'), api.categories(true)]);
      setProducts(p);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, short_description: p.short_description, description: p.description,
      price: String(p.price), old_price: p.old_price ? String(p.old_price) : '', stock: String(p.stock),
      category_id: p.category_id ? String(p.category_id) : '', recommended_age: p.recommended_age || '',
      keywords: p.keywords || '', is_new: !!p.is_new, is_bestseller: !!p.is_bestseller,
      is_featured: !!p.is_featured, enabled: !!p.enabled,
      features: (p.features || []).join('\n'), specifications: (p.specifications || []).join('\n'),
      sizes: (p.sizes || []).join(', '), image: p.image || '', images: p.images || []
    });
    setModalOpen(true);
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload(file);
      const url = res.url;
      setForm(f => {
        const newImages = f.images.includes(url) ? f.images : [...f.images, url];
        return { ...f, image: f.image || url, images: newImages };
      });
      notify('تم رفع الصورة');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url: string) => {
    setForm(f => {
      const images = f.images.filter(i => i !== url);
      return { ...f, images, image: f.image === url ? (images[0] || '') : f.image };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name, short_description: form.short_description, description: form.description,
        price: Number(form.price), old_price: form.old_price ? Number(form.old_price) : null,
        stock: Number(form.stock), category_id: form.category_id ? Number(form.category_id) : null,
        recommended_age: form.recommended_age, keywords: form.keywords,
        is_new: form.is_new, is_bestseller: form.is_bestseller, is_featured: form.is_featured, enabled: form.enabled,
        features: form.features.split('\n').map(s => s.trim()).filter(Boolean),
        specifications: form.specifications.split('\n').map(s => s.trim()).filter(Boolean),
        sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean),
        image: form.image, images: form.images
      };
      if (editingId) {
        await api.updateProduct(editingId, payload);
        notify('تم تحديث المنتج');
      } else {
        await api.createProduct(payload);
        notify('تم إنشاء المنتج');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`حذف "${p.name}"؟`)) return;
    try {
      await api.deleteProduct(p.id);
      notify('تم حذف المنتج');
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  if (loading) return <PageLoader label="Loading products..." />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Products ({products.length})</h1>
        <button onClick={openCreate} className="btn-primary"><PlusIcon size={18} /> Add Product</button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-right text-xs uppercase text-slate-400">
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Badges</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback src={p.image} alt={p.name} className="h-11 w-11 rounded-lg object-cover" />
                    <span className="font-bold text-slate-800">{p.name}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">{p.category_name || '—'}</td>
                <td className="p-4 font-bold text-slate-800">{formatPrice(p.price)}</td>
                <td className="p-4">
                  <span className={`font-bold ${p.stock <= 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>{p.stock}</span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {p.is_new && <span className="badge bg-emerald-100 text-emerald-700">New</span>}
                    {p.is_bestseller && <span className="badge bg-amber-100 text-amber-700">Bestseller</span>}
                    {p.is_featured && <span className="badge bg-purple-100 text-purple-700">Featured</span>}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`badge ${p.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {p.enabled ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Edit</button>
                    <button onClick={() => remove(p)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"><TrashIcon size={14} /> Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Product' : 'Add Product'} wide>
        <form onSubmit={save} className="space-y-4">
          {/* Images */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Images</label>
            <div className="flex flex-wrap gap-3">
              {form.images.map(img => (
                <div key={img} className="relative">
                  <ImageWithFallback src={img} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button type="button" onClick={() => removeImage(img)} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white"><TrashIcon size={12} /></button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500">
                {uploading ? 'Uploading...' : '+ Upload'}
                <input type="file" accept="image/*" onChange={uploadImage} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name *"><input className="input-field" value={form.name} onChange={set('name')} required /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Short description"><textarea className="input-field" rows={2} value={form.short_description} onChange={set('short_description')} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description"><textarea className="input-field" rows={3} value={form.description} onChange={set('description')} /></Field>
            </div>
            <Field label="Price (DZD) *"><input className="input-field" type="number" min="0" value={form.price} onChange={set('price')} required /></Field>
            <Field label="Old price (optional)"><input className="input-field" type="number" min="0" value={form.old_price} onChange={set('old_price')} /></Field>
            <Field label="Stock *"><input className="input-field" type="number" min="0" value={form.stock} onChange={set('stock')} required /></Field>
            <Field label="Category">
              <select className="input-field" value={form.category_id} onChange={set('category_id')}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Recommended age"><input className="input-field" value={form.recommended_age} onChange={set('recommended_age')} placeholder="مثال: 3 - 8 سنوات" /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Keywords (comma separated)"><input className="input-field" value={form.keywords} onChange={set('keywords')} placeholder="زي شرطي, بدلة أطفال" /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Features (one per line)"><textarea className="input-field" rows={3} value={form.features} onChange={set('features')} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Specifications (format: Label: value, one per line)"><textarea className="input-field" rows={3} value={form.specifications} onChange={set('specifications')} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="المقاسات (مفصولة بفواصل، مثال: 2-3 سنوات, 4-5 سنوات, 6-7 سنوات)"><input className="input-field" value={form.sizes} onChange={set('sizes')} placeholder="2-3 سنوات, 4-5 سنوات, 6-7 سنوات" /></Field>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle label="New" checked={form.is_new} onChange={set('is_new')} />
            <Toggle label="Bestseller" checked={form.is_bestseller} onChange={set('is_bestseller')} />
            <Toggle label="Featured" checked={form.is_featured} onChange={set('is_featured')} />
            <Toggle label="Enabled" checked={form.enabled} onChange={set('enabled')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (e: React.ChangeEvent<any>) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand-600" />
      {label}
    </label>
  );
}
