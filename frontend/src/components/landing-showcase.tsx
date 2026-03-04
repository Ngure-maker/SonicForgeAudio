"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Product } from "@/lib/types";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

interface ProductListResponse {
  results?: Product[];
}

type TabKey = "all" | "new" | "featured" | "top";

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 901,
    name: "Apple iPad Mini G2356",
    description: "",
    price: "1250",
    discounted_price: "1050",
    stock_quantity: 20,
    sku: "ELE-IPAD-GEN-1291",
    category: 1,
    category_name: "SmartPhone",
    brand: 1,
    is_active: true,
    primary_image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 902,
    name: "Canon Smart Camera",
    description: "",
    price: "1250",
    discounted_price: "1050",
    stock_quantity: 12,
    sku: "ELE-CAMR-GEN-2291",
    category: 1,
    category_name: "SmartPhone",
    brand: 1,
    is_active: true,
    primary_image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 903,
    name: "Professional Lens Kit",
    description: "",
    price: "1250",
    discounted_price: "1050",
    stock_quantity: 16,
    sku: "ELE-LENS-GEN-1292",
    category: 1,
    category_name: "SmartPhone",
    brand: 1,
    is_active: true,
    primary_image: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 904,
    name: "Wireless Earbud Mini",
    description: "",
    price: "1250",
    discounted_price: "1050",
    stock_quantity: 50,
    sku: "ELE-EARB-GEN-1292",
    category: 1,
    category_name: "SmartPhone",
    brand: 1,
    is_active: true,
    primary_image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80",
  },
];

function toMedia(url?: string | null) {
  if (!url) return "https://placehold.co/500x500/f2f2f2/6e7781?text=Product";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

function money(value: string | number | null | undefined) {
  const num = Number(value || 0);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LandingShowcase() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<TabKey>("all");

  useEffect(() => {
    apiRequest<Product[] | ProductListResponse>("/products/?ordering=-created_at&in_stock=true")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        setProducts(list.slice(0, 16));
      })
      .catch(() => setProducts([]));
  }, []);

  const items = products.length ? products : FALLBACK_PRODUCTS;
  const filtered = useMemo(() => {
    if (tab === "new") return items.slice(0, 8);
    if (tab === "featured") return items.filter((item) => Boolean(item.is_featured)).slice(0, 8);
    if (tab === "top") return [...items].sort((a, b) => b.stock_quantity - a.stock_quantity).slice(0, 8);
    return items.slice(0, 8);
  }, [items, tab]);

  const mini = items.slice(0, 6);

  return (
    <section className="home-products-shell">
      <section className="home-products-head">
        <h2>Our Products</h2>
        <div>
          <button type="button" className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All Products</button>
          <button type="button" className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}>New Arrivals</button>
          <button type="button" className={tab === "featured" ? "active" : ""} onClick={() => setTab("featured")}>Featured</button>
          <button type="button" className={tab === "top" ? "active" : ""} onClick={() => setTab("top")}>Top Selling</button>
        </div>
      </section>

      <section className="home-product-grid">
        {filtered.map((product, idx) => (
          <article key={`${product.id}-${idx}`} className="home-product-card">
            <span className={`home-badge ${idx % 3 === 1 ? "sale" : ""}`}>{idx % 3 === 1 ? "Sale" : "New"}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toMedia(product.primary_image)} alt={product.name} />
            <p>{product.category_name || "SmartPhone"}</p>
            <h3>{product.name}</h3>
            <div>
              <span>{money(product.price)}</span>
              <strong>{money(product.discounted_price || product.price)}</strong>
            </div>
            <Link href={`/products/${product.id}`}>Add To Cart</Link>
          </article>
        ))}
      </section>

      <section className="home-offer-pair">
        <article>
          <h3>EOS Rebel T7i Kit</h3>
          <p>$899.99</p>
          <Link href="/special-offers">Shop Now</Link>
        </article>
        <article>
          <h3>SALE</h3>
          <p>Get UP To 50% Off</p>
          <Link href="/special-offers">Shop Now</Link>
        </article>
      </section>

      <section className="home-mini-header">
        <h4>Products</h4>
        <h2>All Product Items</h2>
      </section>

      <section className="home-mini-row">
        <button type="button" aria-label="Previous list">‹</button>
        <div>
          {mini.map((product) => (
            <Link key={`mini-${product.id}`} href={`/products/${product.id}`} className="home-mini-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toMedia(product.primary_image)} alt={product.name} />
              <div>
                <p>{product.category_name || "SmartPhone"}</p>
                <h3>{product.name}</h3>
                <div>
                  <span>{money(product.price)}</span>
                  <strong>{money(product.discounted_price || product.price)}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <button type="button" aria-label="Next list">›</button>
      </section>

      <section className="home-mini-header compact">
        <h4>Bestseller Products</h4>
      </section>
      <section className="home-mini-grid">
        {mini.map((product) => (
          <Link key={`best-${product.id}`} href={`/products/${product.id}`} className="home-mini-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toMedia(product.primary_image)} alt={product.name} />
            <div>
              <p>{product.category_name || "SmartPhone"}</p>
              <h3>{product.name}</h3>
              <div>
                <span>{money(product.price)}</span>
                <strong>{money(product.discounted_price || product.price)}</strong>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </section>
  );
}
