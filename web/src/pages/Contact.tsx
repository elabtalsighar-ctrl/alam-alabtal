import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/Toast';
import { useSEO } from '../lib/seo';
import { api } from '../lib/api';
import { WhatsAppIcon } from '../components/icons';

export default function Contact() {
  const { settings } = useSettings();
  const { notify } = useToast();
  useSEO({
    title: 'تواصل معنا | عالم الأبطال الصغار',
    description: 'تواصل مع عالم الأبطال الصغار عبر WhatsApp أو فيسبوك أو إنستغرام.'
  });

  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<any>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.name.trim()) er.name = 'الرجاء إدخال الاسم.';
    if (!form.phone.trim()) er.phone = 'الرجاء إدخال رقم الهاتف.';
    if (!form.message.trim()) er.message = 'الرجاء كتابة رسالتك.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSending(true);
    try {
      await api.contact(form);
      notify('تم إرسال رسالتك بنجاح، سنتواصل معك قريباً.');
      setForm({ name: '', phone: '', message: '' });
    } catch (err: any) {
      notify(err.message || 'حدث خطأ، حاول مرة أخرى.', 'error');
    } finally {
      setSending(false);
    }
  };

  const socials = [
    { label: 'WhatsApp', href: settings?.whatsapp_number ? `https://wa.me/${String(settings.whatsapp_number).replace(/[^0-9]/g, '')}` : '', icon: <WhatsAppIcon size={22} />, color: 'bg-[#25D366]' },
    { label: 'فيسبوك', href: settings?.facebook_url || '', icon: <span className="text-xl font-extrabold">f</span>, color: 'bg-[#1877F2]' },
    { label: 'إنستغرام', href: settings?.instagram_url || '', icon: <span className="text-xl">📷</span>, color: 'bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]' },
    { label: 'تيك توك', href: settings?.tiktok_url || '', icon: <span className="text-xl">🎵</span>, color: 'bg-slate-800' }
  ].filter(s => s.href);

  return (
    <div className="container-px max-w-3xl py-12">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 sm:text-4xl">تواصل معنا</h1>
      <p className="mb-6 text-slate-600">سؤال؟ استفسار؟ نحن هنا لمساعدتك في اختيار أفضل منتج لبطل صغيرك.</p>

      {socials.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-3">
          {socials.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 rounded-xl2 ${s.color} px-5 py-3 font-bold text-white shadow-soft transition hover:opacity-90`}>
              {s.icon} {s.label}
            </a>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft" noValidate>
        <h2 className="mb-4 text-lg font-extrabold text-slate-800">أرسل لنا رسالة</h2>
        <div className="space-y-4">
          <Field label="الاسم" error={errors.name}>
            <input className={`input-field ${errors.name ? '!border-berry-500' : ''}`} value={form.name} onChange={set('name')} placeholder="اسمك الكامل" />
          </Field>
          <Field label="رقم الهاتف" error={errors.phone}>
            <input className={`input-field ${errors.phone ? '!border-berry-500' : ''}`} value={form.phone} onChange={set('phone')} placeholder="05xx xx xx xx" inputMode="tel" dir="ltr" />
          </Field>
          <Field label="الرسالة" error={errors.message}>
            <textarea className={`input-field min-h-[120px] resize-y ${errors.message ? '!border-berry-500' : ''}`} value={form.message} onChange={set('message')} rows={4} placeholder="اكتب رسالتك هنا..." />
          </Field>
          <button type="submit" disabled={sending} className="btn-primary w-full">
            {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
          </button>
        </div>
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
