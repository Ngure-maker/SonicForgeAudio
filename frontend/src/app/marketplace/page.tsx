"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Brand, Category, Product, WishlistItem } from "@/lib/types";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";
const PRICE_CAP = 500000;

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

function toMedia(url?: string | null) {
  if (!url) return "https://placehold.co/640x480?text=Product";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

function toBrandLogo(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

function MarketplaceContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());

  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [ordering, setOrdering] = useState("-created_at");
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  async function loadFilters() {
    const [categoriesRes, brandsRes] = await Promise.all([
      apiRequest<Category[] | { results?: Category[] }>("/categories/"),
      apiRequest<Brand[] | { results?: Brand[] }>("/brands/"),
    ]);
    setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.results || []);
    setBrands(Array.isArray(brandsRes) ? brandsRes : brandsRes.results || []);
  }

  useEffect(() => {
    loadFilters().catch(() => {
      setCategories([]);
      setBrands([]);
    });
  }, []);

  useEffect(() => {
    apiRequest<PaginatedResponse>("/products/?ordering=-created_at")
      .then((res) => setFeaturedProducts(res.results.slice(0, 5)))
      .catch(() => setFeaturedProducts([]));
  }, []);

  useEffect(() => {
    if (!getAccessToken()) return;
    apiRequest<WishlistItem[] | { results?: WishlistItem[] }>("/auth/wishlist/")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        setWishlistIds(new Set(list.map((item) => item.product)));
      })
      .catch(() => setWishlistIds(new Set()));
  }, []);

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (categorySlug) params.set("category_slug", categorySlug);
    if (brandSlug) params.set("brand_slug", brandSlug);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (inStockOnly) params.set("in_stock", "true");
    if (ordering) params.set("ordering", ordering);
    params.set("page", String(page));
    return params.toString();
  }, [search, categorySlug, brandSlug, minPrice, maxPrice, inStockOnly, ordering, page]);

  useEffect(() => {
    setLoading(true);
    apiRequest<PaginatedResponse>(`/products/?${baseQuery}`)
      .then((data) => {
        setProducts(data.results);
        setCount(data.count);
        setError("");
      })
      .catch((err) => {
        setProducts([]);
        setCount(0);
        setError(err instanceof Error ? err.message : "Failed to load products.");
      })
      .finally(() => setLoading(false));
  }, [baseQuery]);

  const shownCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase())),
    [categories, categorySearch],
  );

  const shownBrands = useMemo(
    () => brands.filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase())),
    [brands, brandSearch],
  );

  const totalPages = Math.max(1, Math.ceil(count / 12));
  const sliderPrice = (() => {
    const parsed = Number(maxPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) return PRICE_CAP;
    return Math.min(Math.max(parsed, 0), PRICE_CAP);
  })();

  function clearAllFilters() {
    setSearch("");
    setCategorySlug("");
    setBrandSlug("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setOrdering("-created_at");
    setCategorySearch("");
    setBrandSearch("");
    setPage(1);
  }

  async function toggleWishlist(productId: number) {
    if (!getAccessToken()) {
      setError("Login to save wishlist items.");
      return;
    }
    const isSaved = wishlistIds.has(productId);
    try {
      if (isSaved) {
        await apiRequest(`/auth/wishlist/${productId}/`, { method: "DELETE" });
      } else {
        await apiRequest("/auth/wishlist/", {
          method: "POST",
          body: JSON.stringify({ product_id: productId }),
        });
      }
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(productId);
        else next.add(productId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wishlist update failed.");
    }
  }

  return (
    <section className="market-shell electro-market-shell">
      <section className="electro-benefits-strip">
        <article><strong>FREE RETURN</strong><span>30 days money back</span></article>
        <article><strong>FREE SHIPPING</strong><span>Free shipping on all order</span></article>
        <article><strong>SUPPORT 24/7</strong><span>Online support all day</span></article>
        <article><strong>SECURE PAYMENT</strong><span>We value your security</span></article>
      </section>

      <section className="electro-promo-row">
        <article>
          <div>
            <p>Find The Best Camera for You!</p>
            <h3>Smart Camera</h3>
            <h4><span>40%</span> Off</h4>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80" alt="Camera promo" />
        </article>
        <article>
          <div>
            <p>Find The Best Watches for You!</p>
            <h3>Smart Watch</h3>
            <h4><span>20%</span> Off</h4>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=500&q=80" alt="Watch promo" />
        </article>
      </section>

      <div className="market-layout electro-market-layout">
        <aside className={`market-sidebar electro-market-sidebar ${showFilters ? "open" : ""}`}>
          <div className="market-sidebar-top">
            <h3>Products Categories</h3>
            <button type="button" className="market-sidebar-close" onClick={() => setShowFilters(false)}>×</button>
          </div>

          <div className="market-filter-block">
            {shownCategories.map((category) => (
              <label key={category.id}>
                <input type="radio" checked={categorySlug === category.slug} onChange={() => { setCategorySlug(category.slug); setPage(1); }} />
                {category.name} ({category.products_count ?? 0})
              </label>
            ))}
          </div>

          <div className="market-filter-block">
            <h4>Price</h4>
            <input
              type="range"
              min={0}
              max={PRICE_CAP}
              value={sliderPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
            />
            <small className="market-price-caption">
              Up to KES {sliderPrice.toLocaleString()}
            </small>
            <div className="market-price-row">
              <input type="number" placeholder="Min" min={0} value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                min={0}
                max={PRICE_CAP}
                value={maxPrice}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setMaxPrice("");
                  } else {
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed)) {
                      setMaxPrice(String(Math.min(Math.max(parsed, 0), PRICE_CAP)));
                    }
                  }
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="market-filter-block">
            <h4>Select By Color</h4>
            <label><input type="radio" name="color" /> Gold</label>
            <label><input type="radio" name="color" /> Green</label>
            <label><input type="radio" name="color" /> White</label>
          </div>

          <div className="market-filter-block">
            <h4>Brand</h4>
            <input placeholder="Search brands..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} />
            {shownBrands.map((brand) => (
              <label key={brand.id}>
                <input type="radio" checked={brandSlug === brand.slug} onChange={() => { setBrandSlug(brand.slug); setPage(1); }} />
                {brand.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={toBrandLogo(brand.logo)} alt={brand.name} className="market-brand-logo" />
                )}
                {brand.name}
              </label>
            ))}
          </div>

          <div className="market-filter-block">
            <h4>Featured products</h4>
            <div className="detail-featured-list">
              {featuredProducts.map((item) => (
                <Link key={item.id} href={`/products/${item.id}`} className="detail-featured-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toMedia(item.primary_image)} alt={item.name} />
                  <div>
                    <p>{item.name}</p>
                    <strong>KES {Number(item.discounted_price || item.price).toLocaleString()}</strong>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <button className="market-clear-btn" onClick={clearAllFilters}>View More</button>

          <div className="electro-side-sale">
            <h4>SALE</h4>
            <p>Get UP To 50% Off</p>
            <button type="button">Shop Now</button>
          </div>

          <div className="market-filter-block">
            <h4>PRODUCT TAGS</h4>
            <div className="electro-tags">
              {['new', 'brand', 'black', 'white', 'phone', 'camera', 'drone', 'television'].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </aside>
        {showFilters && <div className="market-filter-backdrop" onClick={() => setShowFilters(false)} />}

        <div>
          <section className="electro-wide-banner">
            <div>
              <h4>SALE</h4>
              <h3>Get UP To 50% Off</h3>
              <button type="button">Shop Now</button>
            </div>
          </section>

          <div className="electro-toolbar">
            <button type="button" className="market-mobile-filter-btn" onClick={() => setShowFilters(true)}>Filters</button>
            <input placeholder="keywords" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select value={ordering} onChange={(e) => { setOrdering(e.target.value); setPage(1); }}>
              <option value="-created_at">Default Sorting</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="name">Name A-Z</option>
            </select>
            <div className="electro-view-toggle">
              <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>▦</button>
              <button type="button" className={viewMode === "compact" ? "active" : ""} onClick={() => setViewMode("compact")}>☰</button>
            </div>
          </div>

          {error && <p className="state-error">{error}</p>}

          <div className={`market-grid ${viewMode === "compact" ? "compact" : ""}`}>
            {loading && Array.from({ length: 9 }).map((_, idx) => (
              <article key={`skeleton-${idx}`} className="market-card skeleton-card" aria-hidden="true">
                <div className="skeleton-line skeleton-image" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </article>
            ))}

            {!loading && products.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="market-card">
                <span className="market-badge">New</span>
                <button
                  className={`wish-btn ${wishlistIds.has(product.id) ? "active" : ""}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                >
                  ♥
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toMedia(product.primary_image)} alt={product.name} />
                <p className="market-brand">{product.category_name || "Category"}</p>
                <h3>{product.name}</h3>
                <p className="market-old-price">KES {Number(product.price).toLocaleString()}</p>
                <p className="market-price">KES {Number(product.discounted_price || product.price).toLocaleString()}</p>
              </Link>
            ))}
          </div>

          {!loading && !products.length && !error && (
            <div className="collection-empty">
              <p>No products matched your filters.</p>
            </div>
          )}

          <div className="electro-pagination">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>«</button>
            {Array.from({ length: Math.min(totalPages, 6) }).map((_, idx) => {
              const pageNo = idx + 1;
              return (
                <button key={pageNo} type="button" className={page === pageNo ? "active" : ""} onClick={() => setPage(pageNo)}>
                  {pageNo}
                </button>
              );
            })}
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>»</button>
          </div>

          <section className="electro-bottom-promos">
            <article>
              <h3>EOS Rebel T7i Kit</h3>
              <p>$899.99</p>
              <button type="button">Shop Now</button>
            </article>
            <article>
              <h3>SALE</h3>
              <p>Get UP To 50% Off</p>
              <button type="button">Shop Now</button>
            </article>
          </section>
        </div>
      </div>
    </section>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<p>Loading products...</p>}>
      <MarketplaceContent />
    </Suspense>
  );
}
