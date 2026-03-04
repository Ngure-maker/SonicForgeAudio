"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Product } from "@/lib/types";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

interface ProductListResponse {
  results?: Product[];
}

type CollectionKind = "special" | "featured" | "best";

function toMedia(url?: string | null) {
  if (!url) return "https://placehold.co/640x480?text=Product";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

function priceValue(p: Product) {
  return Number(p.discounted_price || p.price || 0);
}

export function ProductCollection({ kind }: { kind: CollectionKind }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = kind === "featured"
      ? "/products/?is_featured=true&ordering=-created_at"
      : "/products/?ordering=-created_at";

    apiRequest<Product[] | ProductListResponse>(query)
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        setProducts(list);
        setError("");
      })
      .catch((err) => {
        setProducts([]);
        setError(err instanceof Error ? err.message : "Failed to load products.");
      });
  }, [kind]);

  const visibleProducts = useMemo(() => {
    if (kind === "special") {
      return products
        .filter((p) => p.discounted_price && Number(p.discounted_price) < Number(p.price))
        .sort((a, b) => priceValue(a) - priceValue(b));
    }
    if (kind === "best") {
      return [...products].sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0));
    }
    return products;
  }, [kind, products]);

  if (error) return <p style={{ color: "#b11f1f" }}>{error}</p>;

  if (!visibleProducts.length) {
    return (
      <div className="collection-empty">
        <p>No products found yet for this collection.</p>
        <Link href="/marketplace">Browse Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="collection-grid">
      {visibleProducts.map((product) => {
        const nowPrice = product.discounted_price || product.price;
        const oldPrice = product.discounted_price ? product.price : null;
        return (
          <article key={product.id} className="collection-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toMedia(product.primary_image)} alt={product.name} />
            <p className="collection-brand">{product.brand_name || "BRAND"}</p>
            <h3>{product.name}</h3>
            <div className="collection-price-row">
              <strong>KES {Number(nowPrice).toLocaleString()}</strong>
              {oldPrice && <span>KES {Number(oldPrice).toLocaleString()}</span>}
            </div>
            <Link href={`/products/${product.id}`}>View Product</Link>
          </article>
        );
      })}
    </div>
  );
}
