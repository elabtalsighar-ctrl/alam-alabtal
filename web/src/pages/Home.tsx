import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Category, Product, Review } from '../lib/types';
import ProductCard from '../components/ProductCard';
import { PageLoader, Stars, ImageWithFallback } from '../components/ui';
import { TruckIcon, LockIcon, StarIcon, BanknoteIcon } from './home-icons';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cats, prods, revs] = await Promise.all([
          api.categories(),
          api.products('?sort=bestseller'),
          api.reviews(true)
        ]);
        setCategories(cats);
        setProducts(prods.slice(0, 8));
        const feat = prods.find(p => p.is_featured) || prods[0];
        setFeatured(feat || null);
        setReviews(revs.slice(0, 3));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageLoader label="جارٍ تجهيز المتجر..." />;

  return (
    <div>
      <Hero />
      <TrustBar />
      <CategorySection categories={categories} />
      <BestSellers products={products} />
      {featured && <FeaturedBanner product={featured} />}
      <WhyChooseUs />
      <ReviewsSection reviews={reviews} />
      <Faq />
      <FinalCta />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-bl from-brand-50 via-white to-sun-50">
      <div className="container-px grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2">
        <div className="fade-up text-center lg:text-right">
          <span className="badge mb-4 bg-white text-brand-700 shadow-soft ring-1 ring-brand-100">
            🇩🇿 متجر جزائري للأطفال
          </span>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            خلي صغيرك يعيش <span className="text-brand-600">عالم الأبطال!</span> 🦸‍♂️
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
            منتجات مختارة للأطفال تجمع بين المتعة، الجودة، والخيال في كل لحظة.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link to="/products" className="btn-primary">اكتشف المنتجات</Link>
            <Link to="/products" className="btn-secondary">تسوق الآن</Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 lg:justify-start">
            <div className="flex -space-x-2">
              {['👧', '👦', '🧒'].map((e, i) => (
                <span key={i} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-brand-50 text-xl">
                  {e}
                </span>
              ))}
            </div>
            <div className="text-right">
              <div className="flex gap-0.5 text-sun-500">
                {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
              </div>
              <p className="text-xs font-semibold text-slate-500">ثقة العائلات في الجزائر</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="animate-floaty">
            <ImageWithFallback
              src="/images/hero.svg"
              alt="أطفال سعداء يلعبون مع منتجات عالم الأبطال الصغار"
              className="w-full rounded-3xl shadow-card"
            />
          </div>
          <div className="absolute -bottom-3 right-4 rounded-2xl bg-white px-4 py-3 shadow-card sm:right-0">
            <p className="text-xl">🎁</p>
            <p className="text-xs font-bold text-slate-600">أفكار هدايا رائعة للصغار</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: <TruckIcon />, title: 'توصيل لجميع الولايات', sub: 'نوصل طلبك إليك', color: 'text-brand-500 bg-brand-50' },
    { icon: <LockIcon />, title: 'طلب آمن وبسيط', sub: 'في دقائق معدودة', color: 'text-mint-500 bg-mint-50' },
    { icon: <StarIcon />, title: 'منتجات مختارة بعناية', sub: 'جودة نضمنها لك', color: 'text-sun-500 bg-sun-50' },
    { icon: <BanknoteIcon />, title: 'الدفع عند الاستلام', sub: 'ادفع عند وصول طلبك', color: 'text-berry-500 bg-berry-50' }
  ];
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="container-px grid grid-cols-2 gap-4 py-8 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl2 ${it.color}`}>
              {it.icon}
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-800">{it.title}</p>
              <p className="text-xs text-slate-500">{it.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategorySection({ categories }: { categories: Category[] }) {
  return (
    <section className="container-px py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">اكتشف عالم الأبطال الصغار</h2>
        <p className="mt-2 text-slate-500">تصفح حسب التصنيف لتجد ما يناسب صغيرك</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        {categories.map(cat => (
          <Link
            key={cat.id}
            to={`/products?category=${cat.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition-transform hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
              <ImageWithFallback
                src={cat.image}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-extrabold text-white">{cat.name}</p>
                <span className="mt-1 inline-flex items-center text-sm font-bold text-sun-400 group-hover:text-sun-300">
                  اكتشف
                  <span className="mr-1 transition-transform group-hover:-translate-x-1">←</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BestSellers({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="bg-slate-50 py-16">
      <div className="container-px">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">منتجاتنا المميزة ⭐</h2>
          <p className="mt-2 text-slate-500">الأكثر طلباً لدى العائلات الجزائرية</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="mt-8 text-center">
          <Link to="/products" className="btn-secondary">عرض كل المنتجات</Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedBanner({ product }: { product: Product }) {
  return (
    <section className="container-px py-16">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-l from-brand-600 to-brand-500 shadow-card">
        <div className="grid items-center gap-6 p-8 sm:p-12 lg:grid-cols-2">
          <div className="order-2 text-center lg:order-1 lg:text-right">
            <span className="badge bg-white/20 text-white">✨ مختار بعناية</span>
            <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">{product.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-100 sm:text-base">{product.short_description}</p>
            <div className="mt-5 flex items-center justify-center gap-4 lg:justify-start">
              <span className="text-2xl font-extrabold text-white">{product.price.toLocaleString('fr-DZ')} دج</span>
              {product.old_price && product.old_price > product.price && (
                <span className="text-lg text-brand-200 line-through">{product.old_price.toLocaleString('fr-DZ')} دج</span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link to={`/product/${product.slug}`} className="rounded-xl bg-white px-6 py-3.5 text-base font-bold text-brand-700 shadow-soft transition hover:bg-brand-50">
                شاهد المنتج
              </Link>
              <Link to="/products" className="rounded-xl bg-white/15 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25">
                كل المنتجات
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <ImageWithFallback
              src={product.image || ''}
              alt={product.name}
              className="mx-auto w-full max-w-sm rounded-2xl shadow-card"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const items = [
    { icon: '❤️', title: 'منتجات مختارة بعناية', sub: 'منتجات مناسبة وممتعة للصغار.' },
    { icon: '🚚', title: 'توصيل للولايات', sub: 'نوصل طلباتكم لمختلف ولايات الجزائر.' },
    { icon: '📦', title: 'طلب سهل', sub: 'اطلب منتجك في دقائق وبطريقة بسيطة.' },
    { icon: '⭐', title: 'نهتم بتجربتك', sub: 'هدفنا أن تكون تجربة الشراء سهلة ومريحة.' }
  ];
  return (
    <section className="bg-slate-50 py-16">
      <div className="container-px">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">علاش تختار عالم الأبطال الصغار؟</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <div key={i} className="card p-6 text-center">
              <span className="text-4xl">{it.icon}</span>
              <h3 className="mt-3 font-extrabold text-slate-800">{it.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{it.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <section className="container-px py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">آراء زبائننا ❤️</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {reviews.map(r => (
          <div key={r.id} className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-extrabold text-brand-700">
                  {r.customer_name.charAt(0)}
                </span>
                <span className="text-sm font-bold text-slate-800">{r.customer_name}</span>
              </div>
              {r.verified ? (
                <span className="badge bg-mint-50 text-mint-600">✓ شراء موثق</span>
              ) : null}
            </div>
            <div className="mt-3"><Stars rating={r.rating} size={15} /></div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  { q: 'كيفاش نقدر نطلب؟', a: 'اختر المنتج وأضفه للسلة، ثم أدخل معلومات التوصيل وأكد الطلب.' },
  { q: 'هل يوجد الدفع عند الاستلام؟', a: 'نعم، الدفع عند الاستلام.' },
  { q: 'هل التوصيل متوفر لجميع الولايات؟', a: 'نعم، حسب مناطق التوصيل المتاحة.' },
  { q: 'كم يستغرق التوصيل؟', a: 'من 2 إلى 5 أيام عمل حسب الولاية.' },
  { q: 'هل يمكنني إلغاء الطلب؟', a: 'يمكن التواصل مع خدمة العملاء قبل شحن الطلب.' },
  { q: 'كيف يمكنني التواصل معكم؟', a: 'عن طريق WhatsApp أو معلومات الاتصال الموجودة في الموقع.' }
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="container-px max-w-3xl py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">الأسئلة الشائعة</h2>
      </div>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-soft">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right"
              aria-expanded={open === i}
            >
              <span className="font-bold text-slate-800">{f.q}</span>
              <span className={`text-brand-500 transition-transform ${open === i ? 'rotate-180' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            {open === i && (
              <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-sm text-slate-500">
        عندك سؤال آخر؟ <Link to="/contact" className="font-bold text-brand-600">تواصل معنا</Link>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-px pb-16">
      <div className="rounded-3xl bg-gradient-to-br from-sun-400 via-sun-500 to-brand-500 p-8 text-center shadow-card sm:p-14">
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">جاهز تخلي صغيرك يعيش مغامرة جديدة؟ 🚀</h2>
        <p className="mx-auto mt-3 max-w-lg text-white/90">اختر منتجاً سيجعل طفلك سعيداً. الطلب سهل، والتوصيل سريع.</p>
        <Link to="/products" className="btn-primary mt-6 !bg-white !text-brand-700 hover:!bg-brand-50">
          اكتشف المنتجات
        </Link>
      </div>
    </section>
  );
}
