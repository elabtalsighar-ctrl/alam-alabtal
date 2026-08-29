import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { MenuIcon, CloseIcon } from '../../components/icons';

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/settings', label: 'Settings' }
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-l border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sun-400 to-berry-500 text-lg text-white">🦸</span>
          <div>
            <p className="font-extrabold text-slate-800">Admin Panel</p>
            <p className="text-xs text-slate-400">Alam Al-Abtal Al-Sighar</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <button onClick={logout} className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100">
            Log out
          </button>
          <Link to="/" className="mt-2 block rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-bold text-slate-600 hover:bg-slate-200">
            View store
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white p-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Open menu">
          <MenuIcon />
        </button>
        <span className="font-extrabold text-slate-800">Admin Panel</span>
        <button onClick={logout} className="text-sm font-bold text-red-600">Logout</button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-64 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <span className="font-extrabold text-slate-800">Menu</span>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-500"><CloseIcon size={20} /></button>
            </div>
            <nav className="space-y-1 p-4">
              {NAV.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
                  className={({ isActive }) => `block rounded-xl px-4 py-2.5 text-sm font-bold ${isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-0">
        <div className="p-4 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
