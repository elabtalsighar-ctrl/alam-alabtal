import { useSettings } from '../context/SettingsContext';

function track(event: string, params?: Record<string, any>) {
  if (window.fbq) {
    window.fbq('track', event, params);
  }
}

function trackCustom(event: string, params?: Record<string, any>) {
  if (window.fbq) {
    window.fbq('trackCustom', event, params);
  }
}

export function trackPageView() {
  track('PageView');
}

export function trackViewProduct(product: { name: string; slug: string; price: number; category_name?: string }) {
  track('ViewContent', {
    content_name: product.name,
    content_ids: [product.slug],
    content_type: 'product',
    content_category: product.category_name || '',
    value: product.price,
    currency: 'DZD'
  });
}

export function trackAddToCart(product: { name: string; product_id: number; price: number; quantity: number }) {
  track('AddToCart', {
    content_name: product.name,
    content_ids: [String(product.product_id)],
    content_type: 'product',
    value: product.price * product.quantity,
    currency: 'DZD',
    num_items: 1
  });
}

export function trackInitiateCheckout(params: { value: number; num_items: number; contents?: { id: string; quantity: number; item_price: number }[] }) {
  track('InitiateCheckout', {
    value: params.value,
    currency: 'DZD',
    num_items: params.num_items,
    contents: params.contents
  });
}

export function trackPurchase(params: { value: number; order_number: string; contents?: { id: string; quantity: number; item_price: number }[] }) {
  track('Purchase', {
    value: params.value,
    currency: 'DZD',
    content_type: 'product',
    content_ids: params.contents?.map(c => c.id) || [],
    order_id: params.order_number,
    num_items: params.contents?.reduce((s, c) => s + c.quantity, 0) || 0
  });
}

export function trackSearch(search_string: string) {
  track('Search', {
    search_string,
    content_type: 'product'
  });
}

export function trackLead(params?: { content_name?: string }) {
  track('Lead', {
    content_name: params?.content_name || 'Contact Form',
    content_type: 'product'
  });
}

export function trackViewCategory(category: { name: string; id: number }) {
  trackCustom('ViewCategory', {
    content_name: category.name,
    content_ids: [String(category.id)]
  });
}
