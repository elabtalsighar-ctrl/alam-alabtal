export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  enabled: number;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number;
  category_id: number | null;
  category_name?: string;
  category_slug?: string;
  recommended_age: string;
  is_new: number;
  is_bestseller: number;
  is_featured: number;
  enabled: number;
  image: string;
  keywords: string;
  specifications: string[];
  features: string[];
  images?: string[];
  is_low_stock?: number;
  created_at?: string;
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  old_price?: number | null;
  quantity: number;
  image: string;
  slug: string;
  stock: number;
}

export interface OrderItem {
  id?: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  image: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  items_total: number;
  delivery_cost: number;
  total: number;
  status: string;
  customer_id: number | null;
  created_at: string;
  items: OrderItem[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  orders: Order[];
}

export interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  product_id: number | null;
  product_name?: string;
  verified: number;
  approved: number;
  created_at: string;
}

export interface Settings {
  store_name: string;
  store_name_en: string;
  store_description: string;
  logo: string;
  whatsapp_number: string;
  whatsapp_message: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  contact_phone: string;
  contact_email: string;
  delivery_pricing: string;
  delivery_info: string;
  delivery_time: string;
  low_stock_threshold: string;
  shipping_free_over: string;
  [key: string]: string;
}

export interface Stats {
  totalOrders: number;
  totalSales: number;
  newOrders: number;
  delivered: number;
  cancelled: number;
  totalProducts: number;
  lowStock: number;
  recentOrders: Order[];
  salesByDay: { day: string; total: number; orders: number }[];
}
