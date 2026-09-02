import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Category, Product } from '../lib/types';
import ProductCard from '../components/ProductCard';
import { PageLoader, EmptyState } from '../components/ui';
import { SearchIcon, ChevronDownIcon } from '../components/icons';
import { trackSearch, trackViewCategory } from '../lib/pixel';

const AGE_GROUPS = ['0 - 2', '2 - 4', '3 - 6', '4 - 8', '6 - 10', '8 - 12'];

const SORTS = [
  { value: 'bestseller', label: 'الأكثر مبيعًا' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر من الأعلى للأقل' }
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'bestseller';
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [age, setAge] = useState(params.get('age') || '');
  const [available, setAvailable] = useState(params.get('available') === 'true');

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    if (sort) qs.set('sort', sort);
    if (minPrice) qs.set('min', String(minPrice));
    if (maxPrice) qs.set('max', String(maxPrice));
    if (age) qs.set('age', age);
    if (available) qs.set('available', 'true');
    api.products(`?${qs.toString()}`).then(setAllProducts).catch(() => {}).finally(() => setLoading(false));
  }, [q, category, sort, minPrice, maxPrice, age, available]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const applyPrice = () => {
    setMinPrice(priceRange.min ? Number(priceRange.min) : null);
    setMaxPrice(priceRange.max ? Number(priceRange.max) : null);
  };

  const clearFilters = () => {
    setParams({}, { replace: true });
    setPriceRange({ min: '', max: '' });
    setMinPrice(null);
    setMaxPrice(null);
    setAge('');
    setAvailable(false);
  };

  const hasFilters = q || category || sort !== 'bestseller' || minPrice !== null || maxPrice !== null || age || available;

  return (
    <div className="container-px py-8">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">كل المنتجات</h1>
        <p className="mt-2 text-slate-500">اكتشف منتجات عالم الأبطال الصغار</p>
      </header>

      {/* Search */}
      <form
        onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const searchQuery = String(fd.get('q') || ''); updateParam('q', searchQuery); if (searchQuery.trim()) trackSearch(searchQuery); }}
        className="mx-auto mb-6 max-w-xl"
        role="search"
      >
        <div className="relative">
          <input
            name="q"
            defaultValue={q}
            placeholder="ابحث عن منتج... مثال: زي شرطي"
            className="input-field py-4 pr-12 pl-4 text-base"
            aria-label="بحث عن منتج"
          />
          <button type="submit" aria-label="بحث" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon size={20} />
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <FilterSelect label="التصنيف" value={category} onChange={v => updateParam('category', v)}>
          <option value="">كل التصنيفات</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </FilterSelect>

        <FilterSelect label="الفئة العمرية" value={age} onChange={v => { setAge(v); updateParam('age', v); }}>
          <option value="">كل الأعمار</option>
          {AGE_GROUPS.map(a => <option key={a} value={a}>{a} سنوات</option>)}
        </FilterSelect>

        <FilterSelect label="الفرز" value={sort} onChange={v => updateParam('sort', v)}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </FilterSelect>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-500">السعر (دج)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="من"
              value={priceRange.min}
              onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))}
              className="input-field w-24 py-2 text-sm"
              aria-label="الحد الأدنى للسعر"
            />
            <span className="text-slate-400">—</span>
            <input
              type="number"
              min={0}
              placeholder="إلى"
              value={priceRange.max}
              onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))}
              className="input-field w-24 py-2 text-sm"
              aria-label="الحد الأقصى للسعر"
            />
            <button onClick={applyPrice} className="btn-secondary px-4 py-2 text-sm">تطبيق</button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={available}
            onChange={e => setAvailable(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          المتوفر فقط
        </label>

        {hasFilters && (
          <button onClick={clearFilters} className="text-sm font-bold text-berry-500 hover:underline">
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <PageLoader label="جارٍ تحميل المنتجات..." />
      ) : allProducts.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="ما لقيناش المنتج اللي راك تقلب عليه."
          subtitle="جرب كلمات أخرى أو تصفح المنتجات الأكثر مبيعًا."
          action={() => { setParams({}, { replace: true }); setPriceRange({ min: '', max: '' }); setMinPrice(null); setMaxPrice(null); setAge(''); setAvailable(false); }}
          actionLabel="شوف المنتجات الأكثر مبيعًا"
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {allProducts.length} منتج
            {q && <span> • نتائج البحث عن "{q}"</span>}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {allProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}

      {q && (
        <div className="mt-10 rounded-2xl bg-slate-50 p-5">
          <h2 className="mb-3 font-extrabold text-slate-800">لم تجد ما تبحث عنه؟</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <Link key={c.id} to={`/products?category=${c.slug}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className="input-field appearance-none py-2.5 pl-10 pe-3 text-sm">
          {children}
        </select>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDownIcon size={18} />
        </span>
      </div>
    </div>
  );
}
