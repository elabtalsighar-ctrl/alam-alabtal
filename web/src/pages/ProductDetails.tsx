import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, formatPrice, discountPct } from '../lib/api';
import type { Product, Review } from '../lib/types';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/Toast';
import { useSEO } from '../lib/seo';
import { trackViewProduct } from '../lib/pixel';
import { Spinner, ImageWithFallback, Stars } from '../components/ui';
import { CartIcon, TruckIcon, LockIcon, CheckCircleIcon, MinusIcon, PlusIcon, ShieldIcon } from '../components/icons';

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add, open } = useCart();
  const { settings } = useSettings();
  const { notify } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedSize, setSelectedSize] = useState('');

  useSEO({
    title: product ? `${product.name} | عالم الأبطال الصغار` : 'عالم الأبطال الصغار',
    description: product?.short_description,
    ogImage: product?.image,
    product: product
      ? { name: product.name, description: product.short_description, price: product.price, image: product.image, availability: product.stock > 0 }
      : null
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await api.product(slug || '');
        setProduct(p);
        setActiveImage(p.images && p.images.length ? p.images[0] : p.image);
        if (window.fbq && settings?.facebook_pixel_id) {
          trackViewProduct({
            name: p.name,
            slug: p.slug,
            price: p.price,
            category_name: p.category_name
          });
        }
        const revs = await api.reviews(true);
        setReviews(revs.filter(r => r.product_id === p.id || r.product_id === null));
      } catch (e: any) {
        if (e.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <div className="container-px py-16"><Spinner /></div>;
  if (notFound || !product) {
    return (
      <div className="container-px max-w-md py-20 text-center">
        <h1 className="text-2xl font-extrabold text-slate-800">المنتج غير موجود 😔</h1>
        <p className="mt-2 text-slate-500">ربما تم حذف هذا المنتج أو أنه غير متوفر حالياً.</p>
        <Link to="/products" className="btn-primary mt-6">العودة إلى المتجر</Link>
      </div>
    );
  }

  const discount = discountPct(product.price, product.old_price);
  const out = product.stock <= 0;
  const gallery = product.images && product.images.length ? product.images : [product.image || ''];
  const avgRating = reviews.length ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 5;

  const handleAdd = () => {
    if (out) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      notify('الرجاء اختيار المقاس', 'error');
      return;
    }
    add({
      product_id: product.id,
      name: product.name,
      price: product.price,
      old_price: product.old_price,
      quantity: qty,
      image: product.image || '',
      slug: product.slug,
      stock: product.stock,
      selected_size: selectedSize || undefined
    });
    notify('تمت إضافة المنتج إلى السلة');
    open();
  };

  const buyNow = () => {
    if (out) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      notify('الرجاء اختيار المقاس', 'error');
      return;
    }
    add({
      product_id: product.id,
      name: product.name,
      price: product.price,
      old_price: product.old_price,
      quantity: qty,
      image: product.image || '',
      slug: product.slug,
      stock: product.stock,
      selected_size: selectedSize || undefined
    });
    navigate('/checkout');
  };

  return (
    <div className="container-px py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-400" aria-label="مسار التنقل">
        <Link to="/" className="hover:text-brand-600">الرئيسية</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-brand-600">المنتجات</Link>
        {product.category_slug && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/products?category=${product.category_slug}`} className="hover:text-brand-600">
              {product.category_name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-slate-600">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-brand-50">
            <ImageWithFallback src={activeImage} alt={product.name} className="aspect-square w-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${activeImage === img ? 'border-brand-600' : 'border-transparent'}`}
                  aria-label={`صورة ${i + 1}`}
                >
                  <ImageWithFallback src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-2 flex items-center gap-3">
            <Stars rating={avgRating} size={18} />
            {reviews.length > 0 && <span className="text-sm text-slate-500">({reviews.length} تقييم)</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-brand-600">{formatPrice(product.price)}</span>
            {discount && (
              <span className="text-lg text-slate-400 line-through">{formatPrice(product.old_price)}</span>
            )}
            {discount && (
              <span className="badge bg-berry-500 text-white">وفّر {discount}%</span>
            )}
          </div>

          {product.stock > 0 && product.is_low_stock && (
            <p className="mt-2 text-sm font-bold text-berry-500">باقي القليل 🔥 — انتهز الفرصة</p>
          )}

          {product.short_description && (
            <p className="mt-4 leading-relaxed text-slate-600">{product.short_description}</p>
          )}

          {product.recommended_age && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
              🎂 العمر الموصى به: {product.recommended_age}
            </div>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-4">
              <span className="mb-2 block text-sm font-bold text-slate-700">اختر المقاس</span>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
                      selectedSize === size
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {!selectedSize && (
                <p className="mt-1 text-xs text-berry-500">الرجاء اختيار المقاس المطلوب</p>
              )}
            </div>
          )}

          {/* Quantity + CTAs */}
          <div className="mt-6">
            <span className="mb-2 block text-sm font-bold text-slate-700">الكمية</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-slate-200">
                <button onClick={() => setQty(q => Math.min(q + 1, product.stock))} disabled={qty >= product.stock} className="p-3 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="زيادة">
                  <PlusIcon size={18} />
                </button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-3 text-slate-600 hover:bg-slate-50" aria-label="تقليل">
                  <MinusIcon size={18} />
                </button>
              </div>
              {out ? (
                <span className="badge bg-slate-800 text-white">نفدت الكمية</span>
              ) : product.stock <= 10 ? (
                <span className="text-xs font-bold text-slate-500">متبقي {product.stock} فقط</span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={handleAdd} disabled={out} className="btn-primary w-full">
                <CartIcon size={20} />
                أضف إلى السلة
              </button>
              <button onClick={buyNow} disabled={out} className="btn-secondary w-full !bg-sun-500 !text-white hover:!bg-sun-600">
                اشترِ الآن
              </button>
            </div>
          </div>

          {/* Delivery & payment info */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600"><TruckIcon size={22} /></span>
              <div>
                <p className="text-sm font-bold text-slate-800">التوصيل متوفر</p>
                <p className="text-xs text-slate-500">لمختلف ولايات الجزائر</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-100 text-mint-600"><LockIcon size={22} /></span>
              <div>
                <p className="text-sm font-bold text-slate-800">الدفع عند الاستلام</p>
                <p className="text-xs text-slate-500">ادفع عند وصول طلبك</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / sections */}
      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">وصف المنتج</h2>
            <p className="leading-relaxed text-slate-600">{product.description || product.short_description}</p>
          </section>

          {product.features && product.features.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-slate-900">المميزات</h2>
              <ul className="space-y-2">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-mint-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.specifications && product.specifications.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-slate-900">مواصفات المنتج</h2>
              <dl className="overflow-hidden rounded-xl border border-slate-100">
                {product.specifications.map((spec, i) => {
                  const [k, ...rest] = spec.split(':');
                  return (
                    <div key={i} className={`flex gap-3 px-4 py-3 ${i % 2 ? 'bg-white' : 'bg-slate-50'}`}>
                      <dt className="w-1/3 font-bold text-slate-700">{k}</dt>
                      <dd className="w-2/3 text-slate-600">{rest.join(':')}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-extrabold text-slate-800">
              <TruckIcon className="text-brand-500" /> معلومات التوصيل
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">التوصيل متوفر لمختلف ولايات الجزائر.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-extrabold text-slate-800">
              <ShieldIcon className="text-mint-500" /> الدفع
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">الدفع عند الاستلام.</p>
          </div>
        </aside>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-extrabold text-slate-900">آراء الزبائن ({reviews.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map(r => (
              <div key={r.id} className="rounded-xl border border-slate-100 p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">{r.customer_name}</span>
                  {r.verified ? <span className="badge bg-mint-50 text-mint-600">✓ شراء موثق</span> : null}
                </div>
                <div className="mt-2"><Stars rating={r.rating} size={15} /></div>
                <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
