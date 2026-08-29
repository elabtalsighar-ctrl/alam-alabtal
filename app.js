const product = {
  id: 1,
  name: 'بدلة شرطة الأطفال',
  price: 4200,
  icon: '👮',
  sizes: [2, 3, 4, 5, 6, 7, 8, 9, 10]
};

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxd2zsWrJtMmAv2L_AcKEb80ow7dp3P2mZpL6fy1q-Pv1Mpc6YJT4zvqW9j4c6r5MU/exec';
const WILAYAS_JSON_URL = 'https://cdn.jsdelivr.net/npm/algeria-wilayas-communes@1.0.0/data/wilayas.json';
const COMMUNES_BY_WILAYA_URL = number => `https://cdn.jsdelivr.net/npm/algeria-wilayas-communes@1.0.0/data/by-wilaya/${String(number).padStart(2, '0')}.json`;
const I18N = {
  ar: {
    announcement: 'توصيل إلى جميع الولايات الجزائرية • الدفع عند الاستلام متاح',
    storeName: 'عالم الأبطال الصغار',
    cart: 'السلة',
    productTitle: 'بدلة شرطة الأطفال',
    productSubtitle: 'بدلة أنيقة ومحبوبة للأطفال، مناسبة للحفلات، التنكر، والتصوير.',
    priceLabel: 'السعر',
    deliveryLabel: 'التوصيل',
    deliveryValue: 'جميع الولايات',
    paymentLabel: 'الدفع',
    paymentValue: 'عند الاستلام',
    itemsLabel: 'المرفقات',
    itemsValue: 'البدلة + القبعة',
    categoryLabel: 'الفئة',
    categoryValue: 'ملابس تنكرية',
    sizeTitle: 'اختر المقاس',
    addToCart: 'أضف إلى السلة',
    whatsapp: 'اطلب عبر واتساب',
    sizeNote: 'المقاسات المتوفرة من 2 إلى 10. اختر المقاس ثم أضف المنتج إلى السلة.',
    cartTitle: 'سلة المشتريات',
    customerTitle: 'بيانات الزبون',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    wilaya: 'الولاية',
    commune: 'البلدية',
    wilayaPlaceholder: 'ابحث عن ولايتك',
    communePlaceholder: 'ابحث عن البلدية',
    wilayaSelect: 'اختر الولاية',
    communeSelect: 'اختر البلدية',
    checkoutNote: 'سيتم إرسال الطلب إلى Google Sheets عند إعداد رابط النشر.',
    total: 'الإجمالي',
    checkout: 'إتمام الطلب ←',
    emptyCart: 'سلتك فارغة الآن<br />اختر المقاس ثم أضف المنتج.',
    noResults: 'لا توجد نتائج',
    loadingCommunes: 'جارٍ تحميل البلديات...',
    communesError: 'تعذر تحميل البلديات',
    selectWilayaFirst: 'اختر الولاية أولًا',
    selectCommuneFirst: 'اختر البلدية أولًا',
    selectSizeFirst: 'اختر المقاس أولًا',
    addProductFirst: 'أضف المنتج إلى السلة أولًا',
    chooseSizeFirst: 'اختر المقاس أولًا',
    submitted: 'تم إرسال الطلب بنجاح',
    sending: 'جارٍ الإرسال...',
    submitPlaceholder: 'ضع رابط Google Apps Script أولًا'
  },
  fr: {
    announcement: 'Livraison dans toutes les wilayas algériennes • Paiement à la livraison disponible',
    cart: 'Panier',
    productTitle: 'Costume de policier pour enfant',
    productSubtitle: 'Un costume élégant et amusant pour les fêtes, le déguisement et les photos.',
    priceLabel: 'Prix',
    deliveryLabel: 'Livraison',
    deliveryValue: 'Toutes les wilayas',
    paymentLabel: 'Paiement',
    paymentValue: 'À la livraison',
    itemsLabel: 'Inclus',
    itemsValue: 'Costume + casquette',
    categoryLabel: 'Catégorie',
    categoryValue: 'Déguisement',
    sizeTitle: 'Choisir la taille',
    addToCart: 'Ajouter au panier',
    whatsapp: 'Commander sur WhatsApp',
    sizeNote: 'Tailles disponibles de 2 à 10. Choisissez une taille puis ajoutez le produit au panier.',
    cartTitle: 'Panier',
    customerTitle: 'Informations client',
    fullName: 'Nom complet',
    phone: 'Numéro de téléphone',
    wilaya: 'Wilaya',
    commune: 'Commune',
    wilayaPlaceholder: 'Rechercher une wilaya',
    communePlaceholder: 'Rechercher une commune',
    wilayaSelect: 'Choisir la wilaya',
    communeSelect: 'Choisir la commune',
    checkoutNote: 'La commande sera envoyée vers Google Sheets après configuration du lien.',
    total: 'Total',
    checkout: 'Valider la commande ←',
    emptyCart: 'Votre panier est vide.<br />Choisissez une taille puis ajoutez le produit.',
    noResults: 'Aucun résultat',
    loadingCommunes: 'Chargement des communes...',
    communesError: 'Impossible de charger les communes',
    selectWilayaFirst: 'Choisissez d’abord la wilaya',
    selectCommuneFirst: 'Choisissez d’abord la commune',
    selectSizeFirst: 'Choisissez d’abord la taille',
    addProductFirst: 'Ajoutez d’abord le produit au panier',
    chooseSizeFirst: 'Choisissez d’abord la taille',
submitted: 'Commande envoyée avec succès',
    sending: 'Envoi en cours...',
    submitPlaceholder: "Ajoutez d'abord le lien Google Apps Script"
  },
  en: {
    announcement: 'Delivery to all Algerian wilayas • Cash on delivery available',
    cart: 'Cart',
    productTitle: 'Kids Police Costume',
    productSubtitle: 'A stylish and playful costume for parties, dress-up, and photos.',
    priceLabel: 'Price',
    deliveryLabel: 'Delivery',
    deliveryValue: 'All wilayas',
    paymentLabel: 'Payment',
    paymentValue: 'Cash on delivery',
    itemsLabel: 'Included',
    itemsValue: 'Costume + cap',
    categoryLabel: 'Category',
    categoryValue: 'Costume wear',
    sizeTitle: 'Choose size',
    addToCart: 'Add to cart',
    whatsapp: 'Order on WhatsApp',
    sizeNote: 'Sizes available from 2 to 10. Choose a size then add the product to the cart.',
    cartTitle: 'Cart',
    customerTitle: 'Customer details',
    fullName: 'Full name',
    phone: 'Phone number',
    wilaya: 'Wilaya',
    commune: 'Commune',
    wilayaPlaceholder: 'Search wilaya',
    communePlaceholder: 'Search commune',
    wilayaSelect: 'Choose wilaya',
    communeSelect: 'Choose commune',
    checkoutNote: 'The order will be sent to Google Sheets once the deployment link is set up.',
    total: 'Total',
    checkout: 'Place order ←',
    emptyCart: 'Your cart is empty.<br />Pick a size then add the product.',
    noResults: 'No results',
    loadingCommunes: 'Loading communes...',
    communesError: 'Unable to load communes',
    selectWilayaFirst: 'Choose wilaya first',
    selectCommuneFirst: 'Choose commune first',
    selectSizeFirst: 'Choose size first',
    addProductFirst: 'Add the product to the cart first',
    chooseSizeFirst: 'Choose size first',
    submitted: 'Order sent successfully',
    submitPlaceholder: 'Set the Google Apps Script link first'
  }
};

let currentLanguage = 'ar';
let wilayaData = [];
let selectedSize = null;
const cart = [];

const sizeGrid = document.querySelector('#sizeGrid');
const selectedSizeLabel = document.querySelector('#selectedSizeLabel');
const cartDrawer = document.querySelector('#cartDrawer');
const overlay = document.querySelector('#overlay');
const checkoutForm = document.querySelector('#checkoutForm');
const checkoutButton = document.querySelector('#checkoutButton');
const wilayaButton = document.querySelector('#wilayaButton');
const wilayaMenu = document.querySelector('#wilayaMenu');
const wilayaSearch = document.querySelector('#wilayaSearch');
const wilayaList = document.querySelector('#wilayaList');
const wilayaInput = document.querySelector('#wilaya');
const communeButton = document.querySelector('#communeButton');
const communeMenu = document.querySelector('#communeMenu');
const communeSearch = document.querySelector('#communeSearch');
const communeList = document.querySelector('#communeList');
const communeInput = document.querySelector('#commune');
const langSwitcher = document.querySelector('#langSwitcher');

const communeCache = new Map();
let selectedWilaya = null;
let selectedCommune = null;

function t(key) {
  return I18N[currentLanguage][key];
}

function getLocalizedName(entry) {
  if (!entry) return '';
  const langKey = `nom_${currentLanguage}`;
  const name = entry[langKey];
  // Fallback if Arabic is garbled (contains replacement chars or is empty)
  if (name && !/[�\uFFFD]/.test(name) && name.trim().length > 0) return name;
  return entry.nom_fr || entry.nom_en || entry.nom_ar || '';
}

function formatPrice(value) {
  return `${value.toLocaleString('fr-DZ')} د.ج`;
}

function renderSizes() {
  sizeGrid.innerHTML = product.sizes.map(size => `<button type="button" data-size="${size}" class="${selectedSize === size ? 'selected' : ''}">${size}</button>`).join('');
  selectedSizeLabel.textContent = selectedSize ? `${t('sizeTitle')}: ${selectedSize}` : t('chooseSizeFirst');
}

function renderCart() {
  const container = document.querySelector('#cartItems');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cartCount').textContent = cart.length;
  document.querySelector('#cartTotal').textContent = formatPrice(total);

  if (!cart.length) {
    container.innerHTML = `<p class="empty-cart">${t('emptyCart')}</p>`;
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="mini-image">${product.icon}</div>
      <div>
        <strong>${item.name}</strong>
        <small>المقاس ${item.size} · ${formatPrice(item.price)} · الكمية ${item.quantity}</small>
      </div>
      <button class="remove" data-remove="${index}">حذف</button>
    </div>
  `).join('');
}

function openCart() {
  cartDrawer.classList.add('open');
  overlay.classList.add('show');
  cartDrawer.setAttribute('aria-hidden', 'false');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  overlay.classList.remove('show');
  cartDrawer.setAttribute('aria-hidden', 'true');
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.querySelector('#announcementText').innerHTML = `${t('announcement').replace('•', '<span>•</span>')}`;
  document.querySelector('#cartLabel').textContent = t('cart');
  document.querySelector('#storeName').textContent = t('storeName');
  document.querySelector('#productTitle').textContent = t('productTitle');
  document.querySelector('#productSubtitle').textContent = t('productSubtitle');
  document.querySelector('#priceLabel').textContent = t('priceLabel');
  document.querySelector('#deliveryLabel').textContent = t('deliveryLabel');
  document.querySelector('#deliveryValue').textContent = t('deliveryValue');
  document.querySelector('#paymentLabel').textContent = t('paymentLabel');
  document.querySelector('#paymentValue').textContent = t('paymentValue');
  document.querySelector('#itemsLabel').textContent = t('itemsLabel');
  document.querySelector('#itemsValue').textContent = t('itemsValue');
  document.querySelector('#categoryLabel').textContent = t('categoryLabel');
  document.querySelector('#categoryValue').textContent = t('categoryValue');
  document.querySelector('#sizeTitle').textContent = t('sizeTitle');
  document.querySelector('#addToCart').textContent = t('addToCart');
  document.querySelector('#whatsappBtn').textContent = t('whatsapp');
  document.querySelector('#sizeNote').textContent = t('sizeNote');
  document.querySelector('#cartTitle').textContent = t('cartTitle');
  document.querySelector('#customerTitle').textContent = t('customerTitle');
  document.querySelector('#fullNameLabel').textContent = t('fullName');
  document.querySelector('#phoneLabel').textContent = t('phone');
  document.querySelector('#wilayaLabel').textContent = t('wilaya');
  document.querySelector('#communeLabel').textContent = t('commune');
  document.querySelector('#wilayaSearch').placeholder = t('wilayaPlaceholder');
  document.querySelector('#communeSearch').placeholder = t('communePlaceholder');
  document.querySelector('#checkoutNote').textContent = t('checkoutNote');
  document.querySelector('#totalLabel').textContent = t('total');
  document.querySelector('#checkoutButton').textContent = t('checkout');

  document.querySelectorAll('#langSwitcher button').forEach(button => {
    button.classList.toggle('active', button.dataset.lang === currentLanguage);
  });

  if (selectedWilaya) wilayaButton.textContent = getLocalizedName(selectedWilaya);
  else wilayaButton.textContent = t('wilayaSelect');

  wilayaInput.value = selectedWilaya ? getLocalizedName(selectedWilaya) : '';

  if (selectedCommune) communeButton.textContent = getLocalizedName(selectedCommune);
  else communeButton.textContent = t('communeSelect');

  communeInput.value = selectedCommune ? getLocalizedName(selectedCommune) : '';

  renderSizes();
  renderWilayas();
  if (selectedWilaya) renderCommunes();
  renderCart();
}

function renderWilayas(filter = '') {
  const query = filter.trim().toLowerCase();
  const list = wilayaData.filter(wilaya => getLocalizedName(wilaya).toLowerCase().includes(query));
  wilayaList.innerHTML = list.map(wilaya => `<button type="button" data-wilaya="${wilaya.wilaya_num}">${getLocalizedName(wilaya)}</button>`).join('') || `<div class="empty-cart">${t('noResults')}</div>`;
}

async function loadWilayas() {
  try {
    const response = await fetch(WILAYAS_JSON_URL);
    const data = await response.json();
    wilayaData = Array.isArray(data.wilayas) ? data.wilayas.slice().sort((a, b) => a.wilaya_num - b.wilaya_num) : [];
  } catch {
    wilayaData = [];
  }
}

function openWilayaMenu() {
  wilayaMenu.hidden = false;
  wilayaSearch.value = '';
  renderWilayas();
  wilayaSearch.focus();
}

function closeWilayaMenu() {
  wilayaMenu.hidden = true;
}

function openCommuneMenu() {
  communeMenu.hidden = false;
  communeSearch.value = '';
  renderCommunes();
  communeSearch.focus();
}

function closeCommuneMenu() {
  communeMenu.hidden = true;
}

async function loadCommunes(wilayaNumber) {
  if (communeCache.has(wilayaNumber)) return communeCache.get(wilayaNumber);
  const response = await fetch(COMMUNES_BY_WILAYA_URL(wilayaNumber));
  const data = await response.json();
  const communes = (data.dairas || []).flatMap(daira => (daira.communes || []).map(commune => ({
    nom_ar: commune.nom_ar,
    nom_fr: commune.nom_fr,
    nom_en: commune.nom_en
  })));
  communeCache.set(wilayaNumber, communes);
  return communes;
}

function renderCommunes(filter = '') {
  const communes = communeCache.get(selectedWilaya?.number) || [];
  const query = filter.trim().toLowerCase();
  const list = communes.filter(commune => getLocalizedName(commune).toLowerCase().includes(query));
  communeList.innerHTML = list.map(commune => {
    const label = getLocalizedName(commune);
    return `<button type="button" data-commune="${label}">${label}</button>`;
  }).join('') || `<div class="empty-cart">${t('noResults')}</div>`;
}

function getOrderPayload() {
  const fullName = document.querySelector('#fullName').value.trim();
  const phone = document.querySelector('#phone').value.trim();
  const wilaya = wilayaInput.value.trim();
  const commune = communeInput.value.trim();

  return {
    timestamp: new Date().toISOString(),
    productName: product.name,
    price: product.price,
    size: selectedSize,
    customerName: fullName,
    phone,
    wilaya,
    commune,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) || product.price
  };
}

async function submitToGoogleSheets() {
  if (!GOOGLE_SHEETS_WEB_APP_URL || GOOGLE_SHEETS_WEB_APP_URL.includes('PASTE_GOOGLE')) {
    selectedSizeLabel.textContent = t('submitPlaceholder');
    return;
  }

  const payload = getOrderPayload();
  checkoutButton.disabled = true;
  checkoutButton.textContent = t('sending');

  try {
    await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    checkoutForm.reset();
    selectedSize = null;
    cart.length = 0;
    renderCart();
    wilayaInput.value = '';
    wilayaButton.textContent = t('wilayaSelect');
    communeInput.value = '';
    communeButton.textContent = t('communeSelect');
    communeButton.disabled = true;
    selectedWilaya = null;
    selectedCommune = null;
    selectedSizeLabel.textContent = t('submitted');
    closeCart();
  } finally {
    checkoutButton.disabled = false;
    checkoutButton.textContent = t('checkout');
  }
}

sizeGrid.addEventListener('click', event => {
  const size = Number(event.target.dataset.size);
  if (!size) return;
  selectedSize = size;
  renderSizes();
});

document.querySelector('#addToCart').addEventListener('click', () => {
  if (!selectedSize) {
    selectedSizeLabel.textContent = t('selectSizeFirst');
    return;
  }

  const existing = cart.find(item => item.size === selectedSize);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      quantity: 1
    });
  }

  renderCart();
  openCart();
});

checkoutForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!cart.length) {
    selectedSizeLabel.textContent = t('addProductFirst');
    return;
  }
  if (!wilayaInput.value) {
    selectedSizeLabel.textContent = t('selectWilayaFirst');
    openWilayaMenu();
    return;
  }
  if (!communeInput.value) {
    selectedSizeLabel.textContent = t('selectCommuneFirst');
    openCommuneMenu();
    return;
  }
  if (!checkoutForm.reportValidity()) return;
  submitToGoogleSheets();
});

wilayaButton.addEventListener('click', () => {
  if (wilayaMenu.hidden) openWilayaMenu();
  else closeWilayaMenu();
});

wilayaSearch.addEventListener('input', event => renderWilayas(event.target.value));

wilayaList.addEventListener('click', event => {
  const number = Number(event.target.dataset.wilaya);
  if (!number) return;
  selectedWilaya = wilayaData.find(wilaya => wilaya.wilaya_num === number) || null;
  wilayaInput.value = getLocalizedName(selectedWilaya);
  wilayaButton.textContent = getLocalizedName(selectedWilaya);
  closeWilayaMenu();
  communeInput.value = '';
  communeButton.textContent = t('communeSelect');
  communeButton.disabled = false;
  selectedCommune = null;
  communeCache.delete(number);
  communeList.innerHTML = `<div class="empty-cart">${t('loadingCommunes')}</div>`;
  loadCommunes(number).then(() => renderCommunes()).catch(() => {
    communeList.innerHTML = `<div class="empty-cart">${t('communesError')}</div>`;
  });
});

communeButton.addEventListener('click', () => {
  if (!selectedWilaya) {
    selectedSizeLabel.textContent = t('selectWilayaFirst');
    openWilayaMenu();
    return;
  }
  if (communeMenu.hidden) openCommuneMenu();
  else closeCommuneMenu();
});

communeSearch.addEventListener('input', event => renderCommunes(event.target.value));

communeList.addEventListener('click', event => {
  const label = event.target.dataset.commune;
  if (!label) return;
  selectedCommune = (communeCache.get(selectedWilaya?.number) || []).find(commune => getLocalizedName(commune) === label) || null;
  communeInput.value = label;
  communeButton.textContent = label;
  closeCommuneMenu();
});

document.addEventListener('click', event => {
  if (!wilayaMenu.hidden && event.target !== wilayaButton && !wilayaMenu.contains(event.target)) closeWilayaMenu();
  if (!communeMenu.hidden && event.target !== communeButton && !communeMenu.contains(event.target)) closeCommuneMenu();
});

document.querySelector('#cartItems').addEventListener('click', event => {
  if (event.target.dataset.remove === undefined) return;
  cart.splice(Number(event.target.dataset.remove), 1);
  renderCart();
});

document.querySelector('#openCart').addEventListener('click', openCart);
document.querySelector('#closeCart').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

renderSizes();
renderCart();
communeButton.disabled = true;
document.querySelector('#checkoutButton').textContent = t('checkout');
loadWilayas().then(() => {
  applyLanguage();
});

langSwitcher.addEventListener('click', event => {
  const lang = event.target.dataset.lang;
  if (!lang || lang === currentLanguage) return;
  currentLanguage = lang;
  applyLanguage();
});
