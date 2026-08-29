import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { WhatsAppIcon } from './icons';

const LINKS = [
  { to: '/', label: 'الرئيسية' },
  { to: '/products', label: 'المنتجات' },
  { to: '/about', label: 'من نحن' },
  { to: '/faq', label: 'الأسئلة الشائعة' },
  { to: '/contact', label: 'اتصل بنا' },
  { to: '/privacy', label: 'سياسة الخصوصية' },
  { to: '/terms', label: 'شروط الاستخدام' },
  { to: '/returns', label: 'سياسة الاسترجاع' }
];

export default function Footer() {
  const { settings } = useSettings();
  const brand = settings?.store_name || 'عالم الأبطال الصغار';
  const fb = settings?.facebook_url;
  const ig = settings?.instagram_url;
  const tk = settings?.tiktok_url;

  const socials = [
    { href: fb, label: 'فيسبوك', icon: 'f' },
    { href: ig, label: 'إنستغرام', icon: '📷' },
    { href: tk, label: 'تيك توك', icon: '🎵' }
  ].filter(s => s.href);

  return (
    <footer className="mt-16 bg-slate-900 text-slate-300">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sun-400 to-berry-500 text-xl">
              🦸
            </span>
            <h3 className="text-lg font-extrabold text-white">{brand}</h3>
          </div>
          <p className="text-sm font-bold text-sun-400">عالم صغير... وفرحة كبيرة ❤️</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {settings?.store_description || 'متجر يهتم بتوفير منتجات جميلة وممتعة للأطفال في الجزائر.'}
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white">روابط مهمة</h4>
          <ul className="grid grid-cols-1 gap-2">
            {LINKS.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-slate-400 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white">تسوق حسب التصنيف</h4>
          <p className="text-sm text-slate-400">
            أزياء الأطفال • ألعاب الأطفال • إكسسوارات • هدايا • منتجات تعليمية • منتجات الإبداع والرسم
          </p>
          <Link to="/products" className="mt-4 inline-block text-sm font-bold text-brand-400 hover:text-brand-300">
            اكتشف كل المنتجات ←
          </Link>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white">تواصل معنا</h4>
          <p className="mb-3 text-sm text-slate-400">{settings?.contact_phone}</p>
          <p className="mb-4 text-sm text-slate-400">{settings?.contact_email}</p>
          <div className="flex gap-2">
            {socials.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white transition-colors hover:bg-brand-600"
              >
                {s.icon === 'f' ? <span className="text-base font-extrabold">f</span> : s.icon}
              </a>
            ))}
            {settings?.whatsapp_number && (
              <a
                href={`https://wa.me/${String(settings.whatsapp_number).replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="واتساب"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white transition-colors hover:bg-[#1fb357]"
              >
                <WhatsAppIcon size={20} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-slate-500 sm:flex-row">
          <p>© 2026 {brand}. جميع الحقوق محفوظة.</p>
          <p className="flex items-center gap-1">صُنع بحب للأبطال الصغار ❤️</p>
        </div>
      </div>
    </footer>
  );
}
