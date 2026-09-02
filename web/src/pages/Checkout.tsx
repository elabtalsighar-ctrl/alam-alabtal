import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatPrice } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/Toast';
import { WILAYAS, validateAlgerianPhone } from '../lib/utils';
import { trackInitiateCheckout } from '../lib/pixel';
import { EmptyState } from '../components/ui';
import { LockIcon, TruckIcon } from '../components/icons';

export default function Checkout() {
  const { items, subtotal, clear, open } = useCart();
  const { settings } = useSettings();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', wilaya: '', commune: '', address: '', stop_desk: '0' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [communes, setCommunes] = useState<{nom:string, has_stop_desk:number}[]>([]);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [deliveryForWilaya, setDeliveryForWilaya] = useState<number | null>(null);
  const [stopDeskFee, setStopDeskFee] = useState<number | null>(null);

  // Fetch communes and real-time delivery price when wilaya changes
  useEffect(() => {
    const m = form.wilaya.match(/\d+/);
    const code = m ? m[0] : '';
    if (!code) { setCommunes([]); setDeliveryForWilaya(null); setStopDeskFee(null); return; }

    // delivery price per wilaya from stored settings (fallback)
    try {
      const fees = JSON.parse(settings?.delivery_fees || '{}');
      if (fees[code] !== undefined) {
        const feeVal = fees[code];
        if (typeof feeVal === 'object' && feeVal !== null) {
          setDeliveryForWilaya(parseFloat(feeVal.home || '350'));
          setStopDeskFee(parseFloat(feeVal.stop_desk || feeVal.home || '350'));
        } else {
          setDeliveryForWilaya(parseFloat(feeVal));
          setStopDeskFee(null);
        }
      } else {
        setDeliveryForWilaya(null);
        setStopDeskFee(null);
      }
    } catch { setDeliveryForWilaya(null); setStopDeskFee(null); }

    // Fetch real-time fee from Ecotrack
    setLoadingFee(true);
    fetch(`/api/ecotrack/fee/${code}`)
      .then(async r => {
        if (!r.ok) throw new Error('');
        const data = await r.json();
        if (data.home !== undefined && data.home !== null && data.source !== 'fallback') setDeliveryForWilaya(data.home);
        if (data.stop_desk !== undefined && data.stop_desk !== null && data.source !== 'fallback') setStopDeskFee(data.stop_desk);
        if (data.stop_desk_available === false && form.stop_desk === '1') {
          setForm(f => ({ ...f, stop_desk: '0' }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFee(false));

    // communes from Ecotrack
    setLoadingCommunes(true);
    fetch(`/api/ecotrack/communes?wilaya_id=${code}`)
      .then(async r=>{
        if(!r.ok) throw new Error('');
        const j=await r.json();
        if(Array.isArray(j)) setCommunes(j);
        else setCommunes([]);
      })
      .catch(()=> setCommunes([]))
      .finally(()=> setLoadingCommunes(false));
    setForm(f=>({...f, commune: ''}));
  }, [form.wilaya, settings?.delivery_fees]);

  const baseDelivery = deliveryForWilaya !== null ? deliveryForWilaya : parseFloat(settings?.delivery_pricing || '350');
  const stopDesk = form.stop_desk === '1' && stopDeskFee !== null ? stopDeskFee : baseDelivery;
  const freeOver = parseFloat(settings?.shipping_free_over || '0');
  const effectiveDelivery = freeOver > 0 && subtotal >= freeOver ? 0 : (form.stop_desk === '1' ? stopDesk : baseDelivery);
  const total = subtotal + effectiveDelivery;

  const set = (k: string) => (e: React.ChangeEvent<any>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: '' }));
  };

  const selectedCommune = communes.find(c=>c.nom===form.commune);
  const deskAvailable = !form.commune || !selectedCommune ? true : selectedCommune.has_stop_desk===1;
  // إذا البلدية لا تدعم المكتب، أعد التوصيل إلى المنزل تلقائياً
  useEffect(()=>{
    if(form.commune && selectedCommune && selectedCommune.has_stop_desk!==1 && form.stop_desk==='1'){
      setForm(f=>({...f, stop_desk:'0'}));
    }
  }, [form.commune, selectedCommune?.has_stop_desk]);

  const validate = (): boolean => {
    const er: Record<string, string> = {};
    if (!form.name.trim()) er.name = 'الرجاء إدخال الاسم الكامل.';
    if (!form.phone.trim()) er.phone = 'الرجاء إدخال رقم الهاتف.';
    else if (!validateAlgerianPhone(form.phone)) er.phone = 'الرجاء إدخال رقم هاتف صحيح.';
    if (!form.wilaya) er.wilaya = 'الرجاء اختيار الولاية.';
    if (!form.commune.trim()) er.commune = 'الرجاء إدخال البلدية.';
    if (!form.address.trim()) er.address = 'الرجاء إدخال العنوان بالتفصيل.';
    if (form.stop_desk==='1' && selectedCommune && selectedCommune.has_stop_desk!==1) er.commune = 'هذه البلدية لا تحتوي على مكتب. اختر التوصيل إلى المنزل أو بلدية أخرى.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.createOrder({
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        wilaya: form.wilaya,
        commune: form.commune.trim(),
        address: form.address.trim(),
        stop_desk: form.stop_desk === '1' ? 1 : 0,
        items: items.map(i => ({
          product_id: i.product_id,
          product_name: i.name,
          unit_price: i.price,
          quantity: i.quantity,
          image: i.image
        }))
      });
      clear();
      if (window.fbq && settings?.facebook_pixel_id) {
        trackInitiateCheckout({
          value: total,
          num_items: items.length,
          contents: items.map(i => ({
            id: String(i.product_id),
            quantity: i.quantity,
            item_price: i.price
          }))
        });
      }
      const order = { ...res.order, items };
      navigate(`/order-success/${res.order.order_number}`, { state: { order } });
    } catch (err: any) {
      notify(err.message || 'حدث خطأ، حاول مرة أخرى.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-px max-w-lg py-16">
        <EmptyState
          icon="🛒"
          title="السلة تاعك فارغة"
          subtitle="مازال ما اخترتش حتى منتج. أضف بعض المنتجات ثم أكمل الطلب."
          action={() => { open(); }}
          actionLabel="عرض المنتجات"
        />
      </div>
    );
  }

  return (
    <div className="container-px max-w-5xl py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900 sm:text-3xl">إتمام الطلب</h1>

      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-2" noValidate>
        {/* Customer info */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <LockIcon className="text-brand-500" /> معلومات الزبون
          </h2>
          <p className="mb-5 text-sm text-slate-500">الدفع عند الاستلام — لا حاجة لإنشاء حساب.</p>

          <div className="space-y-4">
            <Field label="الاسم الكامل" error={errors.name}>
              <input className={`input-field ${errors.name ? '!border-berry-500' : ''}`} value={form.name} onChange={set('name')} placeholder="مثال: أمينة بن علي" />
            </Field>

            <Field label="رقم الهاتف" error={errors.phone}>
              <input className={`input-field ${errors.phone ? '!border-berry-500' : ''}`} value={form.phone} onChange={set('phone')} placeholder="05xx xx xx xx" inputMode="tel" dir="ltr" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="الولاية" error={errors.wilaya}>
                <select className={`input-field ${errors.wilaya ? '!border-berry-500' : ''}`} value={form.wilaya} onChange={set('wilaya')}>
                  <option value="">اختر الولاية</option>
                  {WILAYAS.map(w => <option key={w.code} value={`${w.code} - ${w.name}`}>{w.code} - {w.name}</option>)}
                </select>
              </Field>
              <Field label="البلدية" error={errors.commune}>
                {communes.length > 0 ? (
                  <select className={`input-field ${errors.commune ? '!border-berry-500' : ''}`} value={form.commune} onChange={set('commune')}>
                    <option value="">{loadingCommunes ? 'جارٍ التحميل...' : 'اختر البلدية'}</option>
                    {communes.map(c => <option key={c.nom} value={c.nom}>{c.nom} {c.has_stop_desk ? '• مكتب ✓' : ''}</option>)}
                  </select>
                ) : (
                  <input className={`input-field ${errors.commune ? '!border-berry-500' : ''}`} value={form.commune} onChange={set('commune')} placeholder={form.wilaya ? (loadingCommunes ? 'جارٍ تحميل البلديات...' : 'اكتب اسم البلدية') : 'اختر الولاية أولاً'} />
                )}
              </Field>
            </div>
            {form.wilaya && (
              <div className="rounded-xl bg-brand-50 p-3 text-xs font-bold text-brand-600 space-y-1">
                <p>تكلفة التوصيل إلى {form.wilaya.split(' - ')[1] || form.wilaya}:</p>
                <div className="flex items-center gap-4">
                  {deliveryForWilaya !== null && (
                    <span className={form.stop_desk === '0' ? 'text-brand-700' : 'text-slate-400'}>
                      🏠 المنزل: {formatPrice(deliveryForWilaya)}
                    </span>
                  )}
                  {stopDeskFee !== null && (
                    <span className={form.stop_desk === '1' ? 'text-brand-700' : 'text-slate-400'}>
                      📦 المكتب: {formatPrice(stopDeskFee)}
                    </span>
                  )}
                </div>
                {loadingFee && <p className="text-slate-400">جارٍ جلب السعر من Ecotrack...</p>}
              </div>
            )}

            <Field label="العنوان بالتفصيل" error={errors.address}>
              <textarea className={`input-field min-h-[90px] resize-y ${errors.address ? '!border-berry-500' : ''}`} value={form.address} onChange={set('address')} placeholder="الحي، الشارع، رقم المنزل..." rows={3} />
            </Field>

            <div>
              <span className="mb-2 block text-sm font-bold text-slate-700">نوع التوصيل</span>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition ${form.stop_desk === '0' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="stop_desk" value="0" checked={form.stop_desk === '0'} onChange={set('stop_desk')} className="h-4 w-4 accent-brand-600" />
                    <span className="text-sm font-bold">إلى المنزل 🏠</span>
                  </div>
                  {deliveryForWilaya !== null && <span className="text-xs font-bold">{formatPrice(deliveryForWilaya)}</span>}
                </label>
                <label className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition ${!deskAvailable ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : form.stop_desk === '1' ? 'border-brand-500 bg-brand-50 text-brand-700 cursor-pointer' : 'border-slate-200 bg-white text-slate-600 cursor-pointer'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="stop_desk" value="1" checked={form.stop_desk === '1'} onChange={set('stop_desk')} disabled={!deskAvailable} className="h-4 w-4 accent-brand-600 disabled:opacity-30" />
                    <span className="text-sm font-bold">إلى المكتب 📦</span>
                  </div>
                  {stopDeskFee !== null && <span className="text-xs font-bold">{formatPrice(stopDeskFee)}</span>}
                </label>
              </div>
              {!deskAvailable ? (
                <p className="mt-1 text-xs font-bold text-berry-500">هذه البلدية لا تحتوي على مكتب — التوصيل إلى المنزل فقط</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">{form.stop_desk === '1' ? 'سيتم توصيل الطلب إلى مكتب Anderson الأقرب' : 'التوصيل إلى عنوان الزبون'}</p>
              )}
            </div>
          </div>
        </section>

        {/* Order summary */}
        <section className="h-fit rounded-2xl border border-slate-100 bg-white p-6 shadow-soft lg:sticky lg:top-24">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <TruckIcon className="text-brand-500" /> ملخص الطلب
          </h2>

          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {items.map(i => (
              <div key={i.product_id} className="flex items-center gap-3">
                <img src={i.image || ''} alt={i.name} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{i.name}</p>
                  <p className="text-xs text-slate-500">الكمية: {i.quantity}</p>
                </div>
                <span className="text-sm font-bold text-slate-700">{formatPrice(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>المجموع الفرعي</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>تكلفة التوصيل</span>
              <span className="font-bold">{effectiveDelivery === 0 ? 'مجاني' : formatPrice(effectiveDelivery)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-extrabold text-slate-800">
              <span>الإجمالي</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-mint-50 p-3 text-sm font-bold text-mint-700">
            <LockIcon size={18} />
            الدفع عند الاستلام
          </div>

          <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
            {submitting ? 'جارٍ إرسال الطلب...' : 'تأكيد الطلب'}
          </button>
          <Link to="/products" className="btn-ghost mt-2 w-full">متابعة التسوق</Link>
        </section>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-semibold text-berry-500">{error}</p>}
    </div>
  );
}
