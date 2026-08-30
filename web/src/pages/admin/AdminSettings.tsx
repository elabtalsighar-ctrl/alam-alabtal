import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/Toast';
import { useSEO } from '../../lib/seo';
import { ImageWithFallback } from '../../components/ui';
import { WILAYAS } from '../../lib/utils';

type FAQItem = { q: string; a: string };

export default function AdminSettings() {
  useSEO({ title: 'Settings | Admin' });
  const { settings, refresh } = useSettings();
  const { notify } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
      try {
        const parsed = settings.faq_content ? JSON.parse(settings.faq_content) : null;
        setFaqs(Array.isArray(parsed) ? parsed : []);
      } catch {
        setFaqs([]);
      }
    }
  }, [settings]);

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const setFaq = (i: number, k: keyof FAQItem, v: string) =>
    setFaqs(fa => fa.map((item, idx) => (idx === i ? { ...item, [k]: v } : item)));
  const addFaq = () => setFaqs(fa => [...fa, { q: '', a: '' }]);
  const removeFaq = (i: number) => setFaqs(fa => fa.filter((_, idx) => idx !== i));

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = await api.upload(file);
      setForm(f => ({ ...f, logo: r.url }));
      notify('Logo uploaded');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const testSheets = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const r = await fetch('/api/settings/test-sheets', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'فشل الاختبار');
      notify('تم إرسال اختبار بنجاح — تحقق من Google Sheet');
    } catch (err: any) {
      notify(err.message || 'فشل الاتصال. تأكد من Deploy كـ Anyone', 'error');
    } finally {
      setTesting(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const faqContent = JSON.stringify(faqs.filter(f => f.q && f.a));
      const { faq_content: _omit, ...payload } = form;
      void _omit;
      await api.updateSettings({ ...payload, faq_content: faqContent });
      await refresh();
      notify('Settings saved');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>

      <Section title="Store">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name (Arabic)"><input className="input-field" value={form.store_name || ''} onChange={set('store_name')} /></Field>
          <Field label="Store name (English)"><input className="input-field" value={form.store_name_en || ''} onChange={set('store_name_en')} /></Field>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Store description</label>
          <textarea className="input-field" rows={3} value={form.store_description || ''} onChange={set('store_description')} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          {form.logo && <ImageWithFallback src={form.logo} alt="logo" className="h-14 w-14 rounded-xl object-cover" />}
          <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-bold text-slate-400 hover:border-brand-400 hover:text-brand-500">
            {uploading ? 'Uploading...' : 'Upload logo'}
            <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
          </label>
          {form.logo && <button type="button" onClick={() => setForm(f => ({ ...f, logo: '' }))} className="text-sm font-bold text-red-500">Remove</button>}
        </div>
      </Section>

      <Section title="Contact & WhatsApp">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number (international)"><input className="input-field" dir="ltr" value={form.whatsapp_number || ''} onChange={set('whatsapp_number')} /></Field>
          <Field label="Contact phone"><input className="input-field" value={form.contact_phone || ''} onChange={set('contact_phone')} /></Field>
          <Field label="Contact email"><input className="input-field" dir="ltr" value={form.contact_email || ''} onChange={set('contact_email')} /></Field>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">WhatsApp default message</label>
          <textarea className="input-field" rows={2} value={form.whatsapp_message || ''} onChange={set('whatsapp_message')} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Instagram URL"><input className="input-field" dir="ltr" value={form.instagram_url || ''} onChange={set('instagram_url')} /></Field>
          <Field label="Facebook URL"><input className="input-field" dir="ltr" value={form.facebook_url || ''} onChange={set('facebook_url')} /></Field>
          <Field label="TikTok URL"><input className="input-field" dir="ltr" value={form.tiktok_url || ''} onChange={set('tiktok_url')} /></Field>
        </div>
      </Section>

      <Section title="Delivery & Inventory">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivery price (DZD)"><input className="input-field" type="number" value={form.delivery_pricing || ''} onChange={set('delivery_pricing')} /></Field>
          <Field label="Free shipping over (DZD, 0 = disabled)"><input className="input-field" type="number" value={form.shipping_free_over || ''} onChange={set('shipping_free_over')} /></Field>
          <Field label="Delivery time text"><input className="input-field" value={form.delivery_time || ''} onChange={set('delivery_time')} /></Field>
          <Field label="Low stock threshold"><input className="input-field" type="number" value={form.low_stock_threshold || ''} onChange={set('low_stock_threshold')} /></Field>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Delivery info</label>
          <textarea className="input-field" rows={2} value={form.delivery_info || ''} onChange={set('delivery_info')} />
        </div>
      </Section>

      <Section title="تسعير التوصيل حسب الولاية — من Ecotrack">
        <p className="mb-3 text-sm text-slate-500">حدد سعر التوصيل لكل ولاية. سيُحسب السعر تلقائياً في صفحة الطلب حسب الولاية المختارة. يمكنك جلب الأسعار مباشرة من Ecotrack.</p>
        <div className="mb-4 rounded-xl bg-slate-50 p-4 space-y-3">
          <Field label="Ecotrack Token"><input className="input-field" dir="ltr" type="password" value={form.ecotrack_token || ''} onChange={set('ecotrack_token')} placeholder="PDsIM1GMEu..." /></Field>
          <button type="button" onClick={async ()=>{
          setTesting(true);
          try{
            const params = new URLSearchParams();
            if(form.ecotrack_token) params.set('token', form.ecotrack_token);
            if(form.ecotrack_base_url) params.set('base_url', form.ecotrack_base_url);
            const qs = params.toString() ? `?${params.toString()}` : '';
            const r=await fetch(`/api/ecotrack/fees${qs}`);
            const j=await r.json();
            if(j._debug === 'no_token') throw new Error('أدخل Token Ecotrack أولاً');
            let feesMap: Record<string,string> = {};
            const extractFromArr = (arr: any[]) => {
              arr.forEach((item:any)=>{
                const code=String(item.wilaya_id || item.code_wilaya || item.id || '');
                const price=String(item.tarif || item.price || item.fee || item.montant || '400');
                if(code) feesMap[code]=price;
              });
            };
            if(Array.isArray(j)){
              extractFromArr(j);
            } else if(j && typeof j === 'object') {
              if(j.livraison && Array.isArray(j.livraison)){
                extractFromArr(j.livraison);
              } else if(j.fees){
                feesMap=j.fees;
              } else if(j.data && Array.isArray(j.data)){
                extractFromArr(j.data);
              }
            }
            if(Object.keys(feesMap).length){
              setForm(f=>({...f, delivery_fees: JSON.stringify(feesMap)}));
              notify(`تم جلب ${Object.keys(feesMap).length} سعر من Ecotrack`);
            } else {
              const raw = j._debug ? ` (${j._debug})` : '';
              notify('لم يتم العثور على أسعار في رد Ecotrack. تحقق من الـ Token' + raw, 'error');
            }
          }catch(err:any){ notify(err.message,'error'); } finally{ setTesting(false); }
        }} disabled={testing} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {testing ? 'جارٍ الجلب...' : 'جلب الأسعار من Ecotrack'}
        </button>
        </div>
        <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto rounded-xl border border-slate-100 p-3 sm:grid-cols-3">
          {WILAYAS.map(w=>{
            let fees: Record<string,string>={};
            try{ fees=JSON.parse(form.delivery_fees || '{}'); }catch{}
            const val=fees[String(w.code)] || form.delivery_pricing || '400';
            return (
              <div key={w.code} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs font-bold text-slate-600">{w.code} - {w.name}</span>
                <input className="input-field py-1.5 text-sm" type="number" value={val} onChange={e=>{
                  let f: Record<string,string>={};
                  try{ f=JSON.parse(form.delivery_fees || '{}'); }catch{ f={}; }
                  f[String(w.code)]=e.target.value;
                  setForm(prev=>({...prev, delivery_fees: JSON.stringify(f)}));
                }} />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">إذا تُركت ولاية فارغة سيُستخدم السعر الافتراضي أعلاه.</p>
      </Section>

      <Section title="Google Sheets — ربط الطلبات">
        <p className="mb-3 text-sm text-slate-500">ضع رابط Google Apps Script Web App. عند كل طلب جديد سيتم إرسال البيانات تلقائياً إلى الشيت. اتركه فارغاً لتعطيل الربط.</p>
        <Field label="Google Sheets Web App URL"><input className="input-field" dir="ltr" placeholder="https://script.google.com/macros/s/.../exec" value={form.google_sheets_url || ''} onChange={set('google_sheets_url')} /></Field>
        <button type="button" onClick={testSheets} disabled={testing || !form.google_sheets_url} className="mt-3 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100 disabled:opacity-50">
          {testing ? 'جارٍ الاختبار...' : 'اختبر الاتصال الآن'}
        </button>
        <details className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <summary className="cursor-pointer font-bold text-slate-700">كيف تنشئ الشيت؟ اضغط هنا</summary>
          <ol className="mt-2 list-decimal space-y-1 pr-4">
            <li>أنشئ Google Sheet جديد مع الأعمدة: order_number | timestamp | customer_name | phone | wilaya | commune | address | items | items_total | delivery_cost | total | status</li>
            <li>افتح Extensions → Apps Script والصق الكود التالي واحفظه:</li>
          </ol>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100" dir="ltr">{`function doPost(e){
  try{
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ss.appendRow([data.order_number, data.timestamp, data.customer_name, data.phone, data.wilaya, data.commune, data.address, data.items, data.items_total, data.delivery_cost, data.total, data.status]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({error: String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
          <p className="mt-2">ثم Deploy → New deployment → Web app → Anyone → انسخ الرابط وضعه هنا.</p>
        </details>
      </Section>

      <Section title="Ecotrack — شركة التوصيل">
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.ecotrack_enabled === '1'} onChange={e => setForm(f => ({ ...f, ecotrack_enabled: e.target.checked ? '1' : '0' }))} className="h-4 w-4 accent-brand-600" />
            تفعيل الربط التلقائي مع Ecotrack (عند تأكيد الطلب يُرفع تلقائياً)
          </label>
          <Field label="Ecotrack Token"><input className="input-field" dir="ltr" type="password" value={form.ecotrack_token || ''} onChange={set('ecotrack_token')} placeholder="PDsIM1GMEu..." /></Field>
          <Field label="Base URL (لا تغيره إلا إذا أعطتك الشركة رابطاً آخر)"><input className="input-field" dir="ltr" value={form.ecotrack_base_url || ''} onChange={set('ecotrack_base_url')} placeholder="https://ecotrack.dz/api" /></Field>
          <button type="button" onClick={async () => {
            setTesting(true);
            try{
              const token = localStorage.getItem('admin_token');
              const r = await fetch('/api/ecotrack/test', { method:'POST', headers: token?{Authorization:`Bearer ${token}`}:{}});
              const j = await r.json();
              if(!r.ok) throw new Error(j.error || 'فشل');
              notify('تم الاتصال بـ Ecotrack بنجاح: ' + (j.endpoint || 'OK'));
            }catch(err:any){ notify(err.message || 'فشل الاتصال', 'error'); } finally { setTesting(false); }
          }} disabled={testing} className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100 disabled:opacity-50">
            {testing ? 'جارٍ الاختبار...' : 'اختبر اتصال Ecotrack'}
          </button>
          <p className="text-xs text-slate-500">عند تأكيد الطلب (confirmed) سيتم رفعه تلقائياً وحفظ رقم التتبع في الطلب.</p>
        </div>
      </Section>

      <Section title="Facebook Pixel — التتبع">
        <p className="mb-3 text-sm text-slate-500">أدخل رقم Pixel ID لتتبع مشاهدات المنتجات وعمليات الشراء. اتركه فارغاً لتعطيل التتبع.</p>
        <Field label="Facebook Pixel ID">
          <input className="input-field" dir="ltr" placeholder="1234567890123456" value={form.facebook_pixel_id || ''} onChange={set('facebook_pixel_id')} />
        </Field>
      </Section>

      <Section title="FAQ Content (editable)">
        {faqs.length === 0 && <p className="text-sm text-slate-400">No FAQ items yet.</p>}
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">FAQ #{i + 1}</span>
                <button type="button" onClick={() => removeFaq(i)} className="text-xs font-bold text-red-500 hover:underline">Remove</button>
              </div>
              <input className="input-field mb-2" placeholder="Question" value={f.q} onChange={e => setFaq(i, 'q', e.target.value)} />
              <textarea className="input-field" rows={2} placeholder="Answer" value={f.a} onChange={e => setFaq(i, 'a', e.target.value)} />
            </div>
          ))}
        </div>
        <button type="button" onClick={addFaq} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
          + Add FAQ item
        </button>
      </Section>

      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : 'Save Settings'}</button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-soft">
      <h2 className="mb-4 text-lg font-extrabold text-slate-800">{title}</h2>
      {children}
    </section>
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
