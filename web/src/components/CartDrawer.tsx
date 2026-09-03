import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { formatPrice } from '../lib/api';
import { CloseIcon, PlusIcon, MinusIcon, TrashIcon } from './icons';
import { EmptyState } from './ui';

export default function CartDrawer() {
  const { items, isOpen, close, setQty, remove, subtotal } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const delivery = parseFloat(settings?.delivery_pricing || '350');
  const freeOver = parseFloat(settings?.shipping_free_over || '0');
  const effectiveDelivery = freeOver > 0 && subtotal >= freeOver ? 0 : delivery;
  const total = subtotal + effectiveDelivery;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="سلة المشتريات">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />
      <div className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-card transition-transform">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-extrabold text-slate-800">سلة المشتريات</h2>
          <button onClick={close} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <CloseIcon size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon="🛒"
              title="السلة تاعك فارغة"
              subtitle="مازال ما اخترتش حتى منتج. اكتشف منتجاتنا وخلي صغيرك يختار بطله!"
              action={() => { close(); navigate('/products'); }}
              actionLabel="اكتشف المنتجات"
            />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {items.map(item => (
                <div key={`${item.product_id}${item.selected_size || ''}`} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                  <img
                    src={item.image || ''}
                    alt={item.name}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      <button onClick={() => remove(item.product_id, item.selected_size)} aria-label="إزالة" className="text-slate-300 hover:text-berry-500">
                        <TrashIcon size={18} />
                      </button>
                    </div>
                    {item.selected_size && (
                      <p className="mt-0.5 text-xs font-bold text-brand-600">المقاس: {item.selected_size}</p>
                    )}
                    <p className="mt-1 text-sm font-extrabold text-brand-600">{formatPrice(item.price)}</p>
                    {item.old_price && item.old_price > item.price && (
                      <p className="text-xs text-slate-400 line-through">{formatPrice(item.old_price)}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => setQty(item.product_id, item.quantity - 1, item.selected_size)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        aria-label="تقليل الكمية"
                      >
                        <MinusIcon size={16} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => setQty(item.product_id, item.quantity + 1, item.selected_size)}
                        disabled={item.quantity >= item.stock}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        aria-label="زيادة الكمية"
                      >
                        <PlusIcon size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-100 p-5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>المجموع الفرعي</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>تكلفة التوصيل</span>
                <span className="font-bold">{effectiveDelivery === 0 ? 'مجاني' : formatPrice(effectiveDelivery)}</span>
              </div>
              {freeOver > 0 && subtotal < freeOver && (
                <p className="rounded-xl bg-sun-50 p-2 text-center text-xs font-semibold text-sun-600">
                  أضف بضائع بقيمة {formatPrice(freeOver - subtotal)} للحصول على توصيل مجاني!
                </p>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-800">
                <span>الإجمالي</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                onClick={() => { close(); navigate('/checkout'); }}
                className="btn-primary mt-2 w-full"
              >
                إتمام الطلب
              </button>
              <button onClick={() => { close(); navigate('/products'); }} className="btn-ghost w-full">
                متابعة التسوق
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
