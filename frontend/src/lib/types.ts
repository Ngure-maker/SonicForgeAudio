export type Role = "customer" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  is_suspended: boolean;
  is_active: boolean;
  avatar?: string | null;
}

export interface Address {
  id: number;
  address_type: "shipping" | "billing";
  full_name: string;
  phone_number: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  is_active: boolean;
  products_count?: number;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  is_primary: boolean;
}

export interface ProductVariant {
  id: number;
  name: string;
  value: string;
  sku?: string | null;
  price?: string | null;
  stock_quantity: number;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  discounted_price?: string | null;
  stock_quantity: number;
  sku: string;
  category: number;
  category_name?: string;
  brand: number;
  brand_name?: string;
  brand_slug?: string;
  primary_image?: string | null;
  is_active: boolean;
  is_featured?: boolean;
  images?: ProductImage[];
  variants?: ProductVariant[];
  reviews?: ProductReview[];
}

export interface ProductReview {
  id: number;
  product: number;
  user: number;
  user_username: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface CartItem {
  id: number;
  product: number;
  product_name: string;
  variant: number | null;
  variant_label: string | null;
  product_image?: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total: string;
}

export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  variant: number | null;
  variant_label: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Order {
  id: number;
  invoice_number: string;
  total_amount: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_reference: string;
  items: OrderItem[];
  shipping_address: number | null;
  billing_address: number | null;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  product: number;
  product_name: string;
  product_price: string;
  product_image?: string | null;
  product_stock: number;
  created_at: string;
}
