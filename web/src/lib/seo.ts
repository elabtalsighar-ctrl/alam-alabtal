import { useEffect } from 'react';

export function useSEO({
  title,
  description,
  ogImage,
  product
}: {
  title: string;
  description?: string;
  ogImage?: string;
  product?: { name: string; description?: string; price: number; image?: string; availability?: boolean } | null;
}) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
      setMeta('name', 'twitter:description', description);
    }
    if (ogImage) {
      setMeta('property', 'og:image', ogImage);
    }
    setMeta('property', 'og:title', title);
    setMeta('name', 'twitter:title', title);

    // Product structured data
    const existing = document.getElementById('product-jsonld');
    if (product && existing) {
      const priceCurrency = 'DZD';
      const jsonld = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        description: product.description || '',
        image: product.image || undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency,
          price: product.price,
          availability: product.availability === false
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock'
        }
      };
      existing.textContent = JSON.stringify(jsonld);
    }

    return () => {
      if (product) {
        const el = document.getElementById('product-jsonld');
        if (el) el.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, ogImage]);
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
