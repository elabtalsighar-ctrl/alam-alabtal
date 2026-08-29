import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { CartIcon, MenuIcon, CloseIcon, SearchIcon } from './icons';

const NAV = [
  { to: '/', label: 'الرئيسية' },
  { to: '/products', label: 'المنتجات' },
  { to: '/products', label: 'التصنيفات' },
  { to: '/about', label: 'من نحن' },
  { to: '/faq', label: 'الأسئلة الشائعة' },
  { to: '/contact', label: 'اتصل بنا' }
];

export default function Header() {
  const { count, open } = useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products?q=${encodeURIComponent(query)}`);
    setMobileOpen(false);
  };

  const brandName = settings?.store_name || 'عالم الأبطال الصغار';
  const logo = settings?.logo;

  return (
    <header className={`sticky top-0 z-50 w-full transition-shadow duration-200 ${scrolled ? 'bg-white/95 shadow-soft backdrop-blur' : 'bg-white/80 backdrop-blur'}`}>
      {/* Announcement bar */}
      <div className="bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
        🚚 توصيل لجميع ولايات الجزائر • الدفع عند الاستلام متاح
      </div>

      <div className="container-px flex h-16 items-center gap-3 sm:h-20">
        {/* Mobile menu button */}
        <button
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {/* Brand - right side on desktop (RTL: first) */}
        <Link to="/" className="flex items-center gap-2" aria-label={brandName}>
          {logo ? (
            <img src={logo} alt="الشعار" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sun-400 to-berry-500 text-xl font-extrabold text-white shadow-soft">
              🦸
            </span>
          )}
          <span className="hidden text-lg font-extrabold leading-tight text-slate-800 sm:block">
            {brandName}
          </span>
        </Link>

        {/* Desktop nav - center */}
        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {NAV.map(item => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  isActive && item.to === '/products' ? 'text-brand-700' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Search - desktop */}
          <form ref={searchRef} onSubmit={submitSearch} className="relative hidden md:block" role="search">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-48 rounded-full border border-slate-200 bg-slate-50 py-2 pr-10 pl-4 text-sm transition-all focus:w-64 focus:border-brand-400 focus:bg-white focus:outline-none lg:w-56"
              aria-label="البحث عن منتج"
            />
            <button type="submit" aria-label="بحث" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon size={18} />
            </button>
          </form>

          {/* Cart */}
          <button
            onClick={open}
            className="relative rounded-xl p-2.5 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
            aria-label={`فتح السلة (${count} منتج)`}
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-berry-500 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fade-up border-t border-slate-100 bg-white lg:hidden">
          {/* Mobile search */}
          <form onSubmit={submitSearch} className="p-4" role="search">
            <div className="relative">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="input-field pr-10"
                aria-label="البحث عن منتج"
              />
              <button type="submit" aria-label="بحث" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon size={18} />
              </button>
            </div>
          </form>
          <nav className="flex flex-col px-4 pb-6" aria-label="القائمة المتنقلة">
            {NAV.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
