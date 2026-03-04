"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Product } from "@/lib/types";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

interface ProductListResponse {
  results?: Product[];
}

interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  discountText: string;
  cta: string;
  href: string;
  image: string;
}

const FALLBACK_SLIDES: PromoSlide[] = [
  {
    id: "hero-1",
    title: "On Selected Laptops & Desktop Or Smartphone",
    subtitle: "SAVE UP TO A $200",
    discountText: "Terms and Condition Apply",
    cta: "Shop Now",
    href: "/marketplace",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "hero-2",
    title: "Upgrade Your Setup With New Tech Deals",
    subtitle: "BIG SEASONAL SALE",
    discountText: "Only while stock lasts",
    cta: "View Deals",
    href: "/special-offers",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80",
  },
];

function toMedia(url?: string | null) {
  if (!url) return "https://placehold.co/600x420/f0f0f0/39424e?text=Product";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

export function PromoCarousel() {
  const [active, setActive] = useState(0);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<PromoSlide[]>(FALLBACK_SLIDES);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 5800);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    apiRequest<Product[] | ProductListResponse>("/products/?ordering=-created_at&in_stock=true")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        setHeroProducts(list.slice(0, 8));
      })
      .catch(() => setHeroProducts([]));
  }, []);

  const sideProduct = heroProducts[active % Math.max(1, heroProducts.length)];
  const activeSlide = useMemo(() => slides[active] || FALLBACK_SLIDES[0], [active, slides]);

  function go(step: number) {
    setActive((prev) => (prev + step + slides.length) % slides.length);
  }

  useEffect(() => {
    apiRequest<{ results?: Array<{ id: number; title: string; subtitle: string; cta_text: string; target_url: string; image_url: string | null }> } | Array<{ id: number; title: string; subtitle: string; cta_text: string; target_url: string; image_url: string | null }>>("/core/promotions/")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        if (!list.length) return;
        setSlides(
          list.slice(0, 4).map((item, idx) => ({
            id: String(item.id),
            title: item.title || FALLBACK_SLIDES[idx % FALLBACK_SLIDES.length].title,
            subtitle: item.subtitle || FALLBACK_SLIDES[idx % FALLBACK_SLIDES.length].subtitle,
            discountText: "Terms and Condition Apply",
            cta: item.cta_text || "Shop Now",
            href: item.target_url || "/marketplace",
            image: toMedia(item.image_url) || FALLBACK_SLIDES[idx % FALLBACK_SLIDES.length].image,
          })),
        );
        setActive(0);
      })
      .catch(() => {
        setSlides(FALLBACK_SLIDES);
      });
  }, []);

  return (
    <section className="home-electro-hero">
      <div className="home-hero-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeSlide.image} alt={activeSlide.title} className="home-hero-main-image" />

        <article className="home-hero-copy">
          <p>{activeSlide.subtitle}</p>
          <h1>{activeSlide.title}</h1>
          <span>{activeSlide.discountText}</span>
          <Link href={activeSlide.href}>{activeSlide.cta}</Link>
        </article>
      </div>

      <aside className="home-hero-side">
        <div className="home-hero-save">Save $48.00</div>
        <h4>Special Offer</h4>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={toMedia(sideProduct?.primary_image)} alt={sideProduct?.name || "Offer product"} />
        <p className="home-side-category">{sideProduct?.category_name || "SmartPhone"}</p>
        <h3>{sideProduct?.name || "Apple iPad Mini G2356"}</h3>
        <p className="home-side-price">
          <span>$1,250.00</span>
          <strong>$1,050.00</strong>
        </p>
        <Link href={sideProduct ? `/products/${sideProduct.id}` : "/marketplace"}>Add To Cart</Link>
      </aside>

      <div className="home-hero-controls">
        <button type="button" aria-label="Previous" onClick={() => go(-1)}>←</button>
        <button type="button" aria-label="Next" onClick={() => go(1)}>→</button>
      </div>

      <section className="home-service-strip">
        <article><span>↺</span><div><strong>FREE RETURN</strong><p>30 days money back guarantee!</p></div></article>
        <article><span>✈</span><div><strong>FREE SHIPPING</strong><p>Free shipping on all order</p></div></article>
        <article><span>◉</span><div><strong>SUPPORT 24/7</strong><p>We support online 24 hrs a day</p></div></article>
        <article><span>💳</span><div><strong>RECEIVE GIFT CARD</strong><p>Receive gift all over order $50</p></div></article>
        <article><span>🔒</span><div><strong>SECURE PAYMENT</strong><p>We value your security</p></div></article>
        <article><span>◔</span><div><strong>ONLINE SERVICE</strong><p>Free return products in 30 days</p></div></article>
      </section>
    </section>
  );
}
