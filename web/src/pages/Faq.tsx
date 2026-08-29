import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useSEO } from '../lib/seo';

const DEFAULT_FAQS = [
  { q: 'كيفاش نقدر نطلب؟', a: 'اختر المنتج وأضفه للسلة، ثم أدخل معلومات التوصيل وأكد الطلب.' },
  { q: 'هل يوجد الدفع عند الاستلام؟', a: 'نعم، الدفع عند الاستلام.' },
  { q: 'هل التوصيل متوفر لجميع الولايات؟', a: 'نعم، حسب مناطق التوصيل المتاحة.' },
  { q: 'كم يستغرق التوصيل؟', a: 'من 2 إلى 5 أيام عمل حسب الولاية.' },
  { q: 'هل يمكنني إلغاء الطلب؟', a: 'يمكن التواصل مع خدمة العملاء قبل شحن الطلب.' },
  { q: 'كيف يمكنني التواصل معكم؟', a: 'عن طريق WhatsApp أو معلومات الاتصال الموجودة في الموقع.' }
];

export default function Faq() {
  const { settings } = useSettings();
  useSEO({
    title: 'الأسئلة الشائعة | عالم الأبطال الصغار',
    description: 'إجابات عن الأسئلة الشائعة حول الطلب، التوصيل، الدفع عند الاستلام والمزيد.'
  });

  const [open, setOpen] = useState<number | null>(0);

  let faqs: { q: string; a: string }[] = DEFAULT_FAQS;
  try {
    if (settings?.faq_content) {
      const parsed = JSON.parse(settings.faq_content);
      if (Array.isArray(parsed) && parsed.length) faqs = parsed;
    }
  } catch {
    // fallback to defaults
  }

  const deliveryTime = settings?.delivery_time || 'من 2 إلى 5 أيام عمل';

  return (
    <div className="container-px max-w-3xl py-12">
      <h1 className="mb-8 text-center text-3xl font-extrabold text-slate-900 sm:text-4xl">الأسئلة الشائعة</h1>
      <p className="mb-8 text-center text-slate-600">كل ما تحتاج معرفته عن الطلب والتوصيل والدفع</p>

      <div className="space-y-3">
        {faqs.map((f, i) => {
          const answer = f.q.includes('كم يستغرق') && settings?.delivery_time
            ? deliveryTime
            : f.a;
          return (
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
                <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{answer}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center">
        <p className="text-slate-600">عندك سؤال تاني؟</p>
        <Link to="/contact" className="btn-secondary mt-3">تواصل معنا</Link>
      </div>
    </div>
  );
}
