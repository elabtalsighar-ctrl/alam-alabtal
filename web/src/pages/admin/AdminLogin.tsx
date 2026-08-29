import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSEO } from '../../lib/seo';
import { useToast } from '../../components/Toast';

export default function AdminLogin() {
  useSEO({ title: 'تسجيل دخول المدير | عالم الأبطال الصغار' });
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email.trim(), password);
      localStorage.setItem('admin_token', res.token);
      notify('تم تسجيل الدخول بنجاح');
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'بيانات الدخول غير صحيحة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sun-400 to-berry-500 text-2xl text-white shadow-soft">🦸</span>
          <span className="text-xl font-extrabold text-slate-800">عالم الأبطال الصغار</span>
        </Link>
        <div className="rounded-2xl bg-white p-8 shadow-card">
          <h1 className="text-center text-2xl font-extrabold text-slate-900">لوحة التحكم</h1>
          <p className="mt-2 text-center text-sm text-slate-500">سجل دخول كمدير للمتجر</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{error}</div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="email">البريد الإلكتروني</label>
              <input id="email" type="email" dir="ltr" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@alam-alabtal.shop" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="password">كلمة المرور</label>
              <input id="password" type="password" dir="ltr" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'جارٍ الدخول...' : 'دخول'}
            </button>
          </form>

          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">
            الافتراضي: admin@alam-alabtal.shop / admin123
          </p>
          <Link to="/" className="mt-4 block text-center text-sm font-bold text-brand-600 hover:underline">العودة إلى المتجر</Link>
        </div>
      </div>
    </div>
  );
}
