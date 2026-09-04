import { pool, dbGet, dbAll, dbRun } from './db.js';
import bcrypt from 'bcryptjs';

export function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seed() {
  const existing = await dbGet('SELECT id FROM users WHERE email = $1', ['admin@alam-alabtal.shop']);
  if (!existing) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPassword, 10);
    await dbRun('INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING', ['admin@alam-alabtal.shop', hash, 'admin', 'المدير']);
  }

  const catCount = await dbGet('SELECT COUNT(*) as c FROM categories');
  if (catCount.c > 0) return 'already-seeded';

  const categories = [
    { name: 'أزياء الأطفال', slug: 'kids-costumes', description: 'أزياء تنكرية ومناسبات للأطفال الصغار', image: '/images/cat-costumes.svg' },
    { name: 'ألعاب الأطفال', slug: 'kids-toys', description: 'ألعاب ممتعة وآمنة للأطفال', image: '/images/cat-toys.svg' },
    { name: 'إكسسوارات الأطفال', slug: 'kids-accessories', description: 'إكسسوارات عملية وأنيقة للأطفال', image: '/images/cat-accessories.svg' },
    { name: 'هدايا الأطفال', slug: 'kids-gifts', description: 'أفكار هدايا يحبها الصغار', image: '/images/cat-gifts.svg' },
    { name: 'المنتجات التعليمية', slug: 'educational', description: 'ألعاب وأنشطة تعليمية تنمّي مهارات الطفل', image: '/images/cat-educational.svg' },
    { name: 'منتجات الإبداع والرسم', slug: 'creativity-crafts', description: 'كل ما يحتاجه طفلك للإبداع والرسم', image: '/images/cat-crafts.svg' }
  ];

  const catIds = {};
  for (let idx = 0; idx < categories.length; idx++) {
    const c = categories[idx];
    const result = await dbRun('INSERT INTO categories (name, slug, description, image, enabled, sort_order) VALUES ($1, $2, $3, $4, 1, $5) RETURNING id', [c.name, c.slug, c.description, c.image, idx + 1]);
    catIds[c.slug] = result.id;
  }

  const products = [
    {
      name: 'زي الشرطي الصغير', slug: 'mini-police-costume',
      short: 'زي شرطي كامل مع قبعة، مثالي للحفلات والتنكر واللعب.',
      description: 'زي الشرطي الصغير من أفضل أزياء الأطفال المحبوبة. يأتي بجودة ممتازة وقصّة مريحة، مناسب للحفلات، أعياد الميلاد، واللعب اليومي.',
      price: 4200, old_price: 5000, stock: 30, category: 'kids-costumes', age: '3 - 8 سنوات',
      is_new: 1, is_bestseller: 1, is_featured: 1, image: '/images/prod-police.svg',
      keywords: 'زي شرطي, بدلة شرطة أطفال, زي تنكري شرطة',
      features: 'قماش متين وسهل التنظيف\nإغلاق عملي لسهولة الارتداء\nمريح للحركة واللعب',
      specs: 'المقاس: من 2 إلى 10 سنوات\nالخامة: قطن وبوليستر\nالشكل: زي + قبعة\nاللون: أزرق وبني'
    },
    {
      name: 'زي البطل الخارق', slug: 'superhero-costume',
      short: 'زي البطل الخارق لأطفالك الشجعان، بتصميم مشرق وقصّة مريحة.',
      description: 'دع طفلك يشعر بأنه بطل خارق حقيقي! زي مريح وآمن مع ألوان مشرقة تجعل طفلك نجماً في كل مناسبة.',
      price: 4600, old_price: null, stock: 25, category: 'kids-costumes', age: '3 - 9 سنوات',
      is_new: 0, is_bestseller: 1, is_featured: 1, image: '/images/prod-superhero.svg',
      keywords: 'زي بطل خارق, زي تنكري, بطل خارق أطفال',
      features: 'خامة ناعمة ولطيفة على البشرة\nألوان زاهية مقاومة للبهتان\nمناسب للارتداء اليومي والمناسبات',
      specs: 'المقاس: من 3 إلى 9 سنوات\nالخامة: بوليستر ناعم\nالشكل: زي كامل\nاللون: أزرق وأحمر'
    },
    {
      name: 'حقيبة الأبطال الصغار', slug: 'little-heroes-bag',
      short: 'حقيبة ظهر ملوّنة مثالية للمدرسة والنزهات، بتصميم مرح.',
      description: 'حقيبة ظهر خفيفة ومريحة بتصميم مرح، مناسبة للمدرسة والنزهات والرحلات. مساحات كافية لكل أغراض صغيرك.',
      price: 2800, old_price: 3400, stock: 40, category: 'kids-accessories', age: '3 - 10 سنوات',
      is_new: 1, is_bestseller: 0, is_featured: 0, image: '/images/prod-bag.svg',
      keywords: 'حقيبة ظهر أطفال, حقيبة مدرسة, حقيبة أطفال',
      features: 'خفيفة ومريحة على الظهر\nمساحات تنظيمية متعددة\nمضادة للماء في الأيام الممطرة',
      specs: 'الأبعاد: 30×22×12 سم\nالخامة: بوليستر مقاوم\nالوزن: 250 غرام\nاللون: أزرق وزهري'
    },
    {
      name: 'مجموعة الرسم والإبداع', slug: 'art-and-creativity-set',
      short: 'مجموعة رسم كاملة للأطفال تشمل الأقلام، الألوان، ودفتر الرسم.',
      description: 'مجموعة إبداعية متكاملة تطلق العنان لخيال طفلك. تشمل ألواناً خشبية، أقلام تلوين، وأدوات رسم آمنة للأطفال.',
      price: 3200, old_price: 3900, stock: 50, category: 'creativity-crafts', age: '3 - 12 سنة',
      is_new: 0, is_bestseller: 1, is_featured: 1, image: '/images/prod-crafts.svg',
      keywords: 'مجموعة رسم أطفال, ألوان أطفال, نشاط إبداعي',
      features: 'أدوات رسم آمنة وغير سامة\nمجموعة واسعة من الألوان\nتشجع الإبداع والمهارات الدقيقة',
      specs: 'عدد القطع: 36 قطعة\nتشمل: ألوان خشبية + مائية + دفاتر\nالخامة: مواد آمنة على الأطفال\nمناسبة: من 3 سنوات'
    },
    {
      name: 'لعبة تعليمية للأطفال', slug: 'educational-toy',
      short: 'لعبة تعليمية تساعد الطفل على التعلم والمرح في آن واحد.',
      description: 'لعبة تعليمية ذكية تجمع بين المتعة والتعلم. تساعد الطفل على تطوير مهارات التفكير، الأرقام، والحروف بطريقة ممتعة.',
      price: 3800, old_price: null, stock: 20, category: 'educational', age: '2 - 6 سنوات',
      is_new: 1, is_bestseller: 0, is_featured: 1, image: '/images/prod-educational.svg',
      keywords: 'لعبة تعليمية, ألعاب تعلم, لعبة أرقام حروف',
      features: 'تنمّي مهارات التعلم المبكر\nألوان جذابة للأطفال\nخامة آمنة ومتينة',
      specs: 'الخامة: خشب وبلاستيك معتمد\nالشكل: مكعبات وأشكال\nمناسبة: من 2 سنوات\nالآمن: بدون أجزاء صغيرة خطرة'
    },
    {
      name: 'طقم ألعاب البناء', slug: 'building-blocks-set',
      short: 'مكعبات بناء ملونة تعزز الإبداع والمهارات الحركية.',
      description: 'طقم مكعبات البناء الكلاسيكي المحبوب من الأطفال. يبني الطفل ما يتخيله: أبراجاً، منازل، وأشكالاً مختلفة، مع تطوير قدراته الحركية والإبداعية.',
      price: 3600, old_price: 4200, stock: 35, category: 'kids-toys', age: '3 - 10 سنوات',
      is_new: 0, is_bestseller: 1, is_featured: 1, image: '/images/prod-blocks.svg',
      keywords: 'مكعبات بناء, ألعاب بناء أطفال, لعب إبداعية',
      features: 'تعزز الإبداع والتخيل\nتطور المهارات الحركية\nقطع آمنة بحواف دائرية',
      specs: 'عدد القطع: 100 قطعة\nالخامة: بلاستيك آمن معتمد\nالألوان: متعددة مشرقة\nمناسبة: من 3 سنوات'
    },
    {
      name: 'بدلة رجل الإطفاء الصغير', slug: 'mini-fireman-costume',
      short: 'بدلة رجل إطفاء كاملة مع قبعة لأبطال المستقبل.',
      description: 'بدلة رجل الإطفاء الصغير، مثالية للألعاب التخيلية والحفلات. تفاصيل واقعية تجعل اللعب أكثر متعة.',
      price: 4400, old_price: 5000, stock: 15, category: 'kids-costumes', age: '3 - 8 سنوات',
      is_new: 1, is_bestseller: 0, is_featured: 0, image: '/images/prod-fireman.svg',
      keywords: 'زي رجل إطفاء, بدلة إطفاء أطفال, زي تنكري',
      features: 'قماش متين مقاوم للتمزق\nتصميم واقعي ومبهج\nيأتي مع قبعة مميزة',
      specs: 'المقاس: من 3 إلى 8 سنوات\nالخامة: بوليستر متين\nالشكل: بدلة + قبعة\nاللون: أحمر وأصفر'
    },
    {
      name: 'علبة الهدايا الاحتفالية', slug: 'celebration-gift-box',
      short: 'علبة هدايا متكاملة لأي مناسبة سعيدة تجمع عدة مفاجآت.',
      description: 'علبة هدايا جاهزة تحتوي على مجموعة مختارة بعناية من الألعاب والإكسسوارات، مثالية لأعياد الميلاد والمناسبات السعيدة.',
      price: 5200, old_price: 6200, stock: 12, category: 'kids-gifts', age: '3 - 10 سنوات',
      is_new: 0, is_bestseller: 0, is_featured: 1, image: '/images/prod-gift.svg',
      keywords: 'علبة هدايا, هدية للأطفال, هدية عيد ميلاد',
      features: 'محتوى مختار بعناية\nتغليف أنيق وجاهز للإهداء\nمناسب لمختلف الأعمار',
      specs: 'المحتوى: 5 قطع متنوعة\nالتغليف: علبة أنيقة\nالمناسبة: عيد ميلاد وأعياد\nمناسبة: من 3 سنوات'
    },
    {
      name: 'سبورة الرسم السحرية', slug: 'magic-drawing-board',
      short: 'سبورة رسم قابلة للمسح، مثالية للإبداع المتكرر اللانهائي.',
      description: 'سبورة الرسم السحرية تتيح للطفل الرسم والمحو بلا نهاية. خفيفة وسهلة الحمل، مثالية للسفر والنزهات.',
      price: 2400, old_price: 2900, stock: 45, category: 'creativity-crafts', age: '3 - 10 سنوات',
      is_new: 1, is_bestseller: 0, is_featured: 0, image: '/images/prod-board.svg',
      keywords: 'سبورة رسم أطفال, رسم للأطفال, ألعاب فنية',
      features: 'سطح رسم قابل للمسح بسهولة\nخفيفة ومحمولة\nتحفز الخيال والإبداع',
      specs: 'الأبعاد: 32×25 سم\nالنوع: رسم مغناطيسي\nالوزن: 300 غرام\nمناسبة: من 3 سنوات'
    },
    {
      name: 'طقم أدوات المطبخ الصغير', slug: 'mini-kitchen-set',
      short: 'طقم مطبخ خشبي آمن لتشجيع اللعب التخيلي والتعلم.',
      description: 'طقم مطبخ خشبي صغير يمنح طفلك فرصة اللعب التخيلي وتعلم مهارات الحياة. قطع آمنة ومتينة مصنوعة من الخشب الطبيعي.',
      price: 4000, old_price: 4700, stock: 22, category: 'kids-toys', age: '3 - 8 سنوات',
      is_new: 0, is_bestseller: 0, is_featured: 0, image: '/images/prod-kitchen.svg',
      keywords: 'طقم مطبخ أطفال, ألعاب خشبية, لعبة مطبخ',
      features: 'خامة خشب طبيعي آمن\nيشجع اللعب التخيلي\nمثالي للتعلم المبكر',
      specs: 'عدد القطع: 12 قطعة\nالخامة: خشب طبيعي\nاللون: ألوان طبيعية دافئة\nمناسبة: من 3 سنوات'
    }
  ];

  for (const p of products) {
    const result = await dbRun(
      `INSERT INTO products (name, slug, short_description, description, price, old_price, stock, category_id,
        recommended_age, is_new, is_bestseller, is_featured, enabled, image, keywords, specifications, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13, $14, $15, $16) RETURNING id`,
      [p.name, p.slug, p.short, p.description, p.price, p.old_price, p.stock, catIds[p.category],
       p.age, p.is_new, p.is_bestseller, p.is_featured, p.image, p.keywords, p.specs, p.features]
    );
    await dbRun('INSERT INTO product_images (product_id, image, sort_order) VALUES ($1, $2, 0)', [result.id, p.image]);
  }

  const reviews = [
    { name: 'أمينة', rating: 5, comment: 'منتجات رائعة والجودة ممتازة. طلبي وصل بسرعة والحمد لله.', product: 'mini-police-costume', verified: 1 },
    { name: 'سارة', rating: 5, comment: 'ابني عجبو بزاف زي البطل الخارق، خامة زوينة وسعر مناسب.', product: 'superhero-costume', verified: 1 },
    { name: 'فاطمة', rating: 4, comment: 'التوصيل سريع والتعامل راقي. مجموعة الرسم أعجبت بنتي.', product: 'art-and-creativity-set', verified: 0 }
  ];

  for (const r of reviews) {
    await dbRun(
      'INSERT INTO reviews (customer_name, rating, comment, product_id, verified, approved) VALUES ($1, $2, $3, $4, $5, 1)',
      [r.name, r.rating, r.comment, (await dbGet('SELECT id FROM products WHERE slug = $1', [r.product]))?.id, r.verified]
    );
  }

  return 'seeded';
}
