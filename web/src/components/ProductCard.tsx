import { Link } from 'react-router-dom';
import type { Product } from '../lib/types';
import { formatPrice, discountPct } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';
import { ImageWithFallback, Stars } from './ui';
import { CartIcon, PlusIcon } from './icons';

const RATING_AVG = 4.7;

function ProductBadge({ p }: { p: Product }) {
  if (p.stock <= 0) return <span className="badge absolute right-3 top-3 bg-slate-800/90 text-white">نفدت الكمية</span>;
  if (p.is_bestseller) return <span className="badge absolute right-3 top-3 bg-sun-500 text-white">الأكثر مبيعًا</span>;
  if (p.is_new) return <span className="badge absolute right-3 top-3 bg-mint-500 text-white">جديد</span>;
  if (p.old_price && p.old_price > p.price && discountPct(p.price, p.old_price)) return <span className="badge absolute right-3 top-3 bg-berry-500 text-white">عرض</span>;
  return null;
}

export default function ProductCard({ product }: { product: Product }) {
  const { add, open } = useCart();
  const { notify } = useToast();
  const discount = discountPct(product.price, product.old_price);
  const out = product.stock <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (out) return;
    add({
      product_id: product.id,
      name: product.name,
      price: product.price,
      old_price: product.old_price,
      quantity: 1,
      image: product.image || '',
      slug: product.slug,
      stock: product.stock
    });
    notify('تمت إضافة المنتج إلى السلة');
    open();
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        <ImageWithFallback
          src={product.image || ''}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <ProductBadge p={product} />
        {discount && (
          <span className="badge absolute left-3 top-3 bg-berry-500 text-white">
            -{discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center justify-between">
          {product.category_name && (
            <span className="text-[11px] font-semibold text-brand-500">{product.category_name}</span>
          )}
          {product.is_low_stock ? <span className="text-[11px] font-bold text-berry-500">باقي القليل 🔥</span> : null}
        </div>

        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-800">{product.name}</h3>

        <div className="mt-1.5">
          <Stars rating={RATING_AVG} size={14} />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-brand-600">{formatPrice(product.price)}</span>
          {product.old_price && product.old_price > product.price && (
            <span className="text-xs text-slate-400 line-through">{formatPrice(product.old_price)}</span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-3">
          <button
            onClick={handleAdd}
            disabled={out}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`أضف ${product.name} إلى السلة`}
          >
            <CartIcon size={16} />
            {out ? 'نفدت الكمية' : 'أضف للسلة'}
          </button>
          <span className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-bold text-brand-700">
            تفاصيل
          </span>
        </div>
      </div>
    </Link>
  );
}
