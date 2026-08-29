import { Link } from 'react-router-dom';
import { useSEO } from '../lib/seo';
import { ImageWithFallback } from '../components/ui';

export default function About() {
  useSEO({
    title: 'من نحن | عالم الأبطال الصغار',
    description: 'عالم الأبطال الصغار هو متجر يهتم بتوفير منتجات جميلة وممتعة للأطفال في الجزائر.'
  });

  return (
    <div className="container-px py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <ImageWithFallback src="/images/hero.svg" alt="عالم الأبطال الصغار" className="mx-auto mb-6 w-full max-w-sm rounded-3xl shadow-card" />
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">مرحبا بكم في عالم الأبطال الصغار 🦸‍♂️</h1>
        </div>

        <div className="space-y-5 leading-relaxed text-slate-600">
          <p>
            عالم الأبطال الصغار هو متجر يهتم بتوفير منتجات جميلة وممتعة للأطفال. نؤمن أن كل طفل يستحق يعيش لحظات مليئة باللعب، الخيال والاكتشاف.
          </p>
          <p>
            اخترنا بعناية منتجات تجمع بين المتعة والجودة والأمان، لتكون الخيار الموثوق للعائلات الجزائرية عند البحث عن أزياء، ألعاب، هدايا، ومنتجات تعليمية لأصغرهم.
          </p>
          <p>
            هدفنا بسيط: أن تجد بسهولة شيئاً يحبه صغيرك، مع تجربة شراء مريحة وتوصيل سريع لكل ولايات الجزائر.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { icon: '🎈', title: 'المتعة', sub: 'منتجات تجلب الفرح والابتسامة لكل طفل.' },
            { icon: '🛡️', title: 'الجودة', sub: 'نختار منتجات آمنة ومتينة تناسب الصغار.' },
            { icon: '🚀', title: 'الخيال', sub: 'نساعد طفلك على اكتشاف عوالم جديدة.' },
            { icon: '🇩🇿', title: 'محلي', sub: 'متجر جزائري يفهم احتياج العائلة الجزائرية.' }
          ].map((v, i) => (
            <div key={i} className="card p-6 text-center">
              <span className="text-3xl">{v.icon}</span>
              <h3 className="mt-2 font-extrabold text-slate-800">{v.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{v.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-to-l from-brand-600 to-brand-500 p-8 text-center shadow-card">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">جاهزين نبدأ المغامرة؟</h2>
          <p className="mt-2 text-brand-100">اكتشف منتجاتنا واختر ما يناسب بطل صغيرك.</p>
          <Link to="/products" className="btn-primary mt-5 !bg-white !text-brand-700 hover:!bg-brand-50">اكتشف المنتجات</Link>
        </div>
      </div>
    </div>
  );
}
