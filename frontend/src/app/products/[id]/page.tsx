"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Category, Product, WishlistItem } from "@/lib/types";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://localhost:8001";

function toMedia(url?: string | null) {
  if (!url) return "https://placehold.co/640x480?text=Product";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [saved, setSaved] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");
  const [qty, setQty] = useState(1);
  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);

  async function loadProduct() {
    const res = await apiRequest<Product>(`/products/${id}/`);
    setProduct(res);
    const firstImage = res.images?.[0]?.image || res.primary_image || "";
    setSelectedImage(toMedia(firstImage));
    if (res.variants?.length) setActiveVariantId(res.variants[0].id);
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        await loadProduct();
        const categoriesRes = await apiRequest<{ results?: Category[] } | Category[]>("/categories/");
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.results || []);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    apiRequest<{ results?: Product[] }>(`/products/?category=${product.category}&ordering=-created_at`)
      .then((res) => {
        const list = (res.results || []).filter((p) => p.id !== product.id);
        setRelated(list.slice(0, 8));
      })
      .catch(() => setRelated([]));
  }, [product]);

  useEffect(() => {
    if (!getAccessToken()) return;
    apiRequest<WishlistItem[] | { results?: WishlistItem[] }>("/auth/wishlist/")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        setSaved(list.some((item) => item.product === Number(id)));
      })
      .catch(() => setSaved(false));
  }, [id]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const imgs = product.images?.map((img) => toMedia(img.image)) || [];
    if (!imgs.length) imgs.push(toMedia(product.primary_image));
    return imgs;
  }, [product]);

  const activeVariant = useMemo(
    () => product?.variants?.find((v) => v.id === activeVariantId) || null,
    [product, activeVariantId],
  );

  async function toggleWishlist() {
    if (!getAccessToken()) {
      setError("Login to save wishlist items.");
      return;
    }
    try {
      if (saved) {
        await apiRequest(`/auth/wishlist/${id}/`, { method: "DELETE" });
        setSaved(false);
      } else {
        await apiRequest("/auth/wishlist/", {
          method: "POST",
          body: JSON.stringify({ product_id: Number(id) }),
        });
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wishlist update failed");
    }
  }

  async function addToCart() {
    if (!product) return;
    try {
      await apiRequest("/cart/items/", {
        method: "POST",
        body: JSON.stringify({
          product_id: Number(id),
          variant_id: activeVariant?.id || null,
          quantity: qty,
        }),
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart");
    }
  }

  async function submitReview() {
    if (!getAccessToken()) {
      setError("Login to add a review.");
      return;
    }

    try {
      setSubmittingReview(true);
      await apiRequest("/reviews/", {
        method: "POST",
        body: JSON.stringify({ product: Number(id), rating, comment }),
      });
      setComment("");
      await loadProduct();
      setActiveTab("reviews");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) return <p>Loading product details...</p>;
  if (!product) return <p className="state-error">{error || "Product not found"}</p>;

  return (
    <section className="detail-shell-electro">
      <aside className="detail-sidebar-electro">
        <div className="detail-sidebar-box">
          <input placeholder="keywords" />
        </div>

        <div className="detail-sidebar-box">
          <h3>Products Categories</h3>
          <div className="detail-cat-list">
            {categories.slice(0, 6).map((cat) => (
              <Link key={cat.id} href={`/marketplace?category_slug=${cat.slug}`}>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="detail-sidebar-box">
          <h3>Featured products</h3>
          <div className="detail-featured-list">
            {related.slice(0, 6).map((item) => (
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
      </aside>

      <div className="detail-main-electro">
        <section className="detail-top-electro">
          <div className="detail-gallery-electro">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage || toMedia(product.primary_image)} alt={product.name} className="detail-main-image-electro" />
            <div className="detail-thumb-row-electro">
              {gallery.map((image, idx) => (
                <button key={`${image}-${idx}`} type="button" className={selectedImage === image ? "active" : ""} onClick={() => setSelectedImage(image)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={`${product.name}-${idx + 1}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="detail-summary-electro">
            <h1>{product.name}</h1>
            <p>Category: {product.category_name || "General"}</p>
            <h2>KES {Number(activeVariant?.price || product.discounted_price || product.price).toLocaleString()}</h2>
            <p>{product.stock_quantity > 0 ? `${product.stock_quantity} items in stock` : "Out of stock"}</p>

            <div className="detail-share-row-electro">
              <button type="button">f Share</button>
              <button type="button">x Share</button>
              <button className={`wish-btn ${saved ? "active" : ""}`} type="button" onClick={toggleWishlist}>♥</button>
            </div>

            <p className="detail-description-short">{product.description || "No description provided."}</p>

            {!!product.variants?.length && (
              <div className="detail-variant-row-electro">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={activeVariantId === variant.id ? "active" : ""}
                    onClick={() => setActiveVariantId(variant.id)}
                  >
                    {variant.name}: {variant.value}
                  </button>
                ))}
              </div>
            )}

            <div className="detail-qty-row-electro">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>

            <button className="detail-add-cart-electro" type="button" onClick={addToCart}>Add to cart</button>
          </div>
        </section>

        <section className="detail-tabs-electro">
          <div className="detail-tab-heads">
            <button className={activeTab === "description" ? "active" : ""} onClick={() => setActiveTab("description")}>Description</button>
            <button className={activeTab === "reviews" ? "active" : ""} onClick={() => setActiveTab("reviews")}>Reviews</button>
          </div>

          {activeTab === "description" ? (
            <p>{product.description || "No description available."}</p>
          ) : (
            <div>
              {product.reviews?.length ? product.reviews.map((review) => (
                <article key={review.id} className="review-card">
                  <strong>{review.user_username}</strong>
                  <span>{"★".repeat(review.rating)}</span>
                  <p>{review.comment || "No comment"}</p>
                </article>
              )) : <p>No reviews yet.</p>}
            </div>
          )}
        </section>

        <section className="detail-comment-electro">
          <h3>Leave a Reply</h3>
          <div className="detail-comment-grid">
            <input placeholder="Your Name" />
            <input placeholder="Your Email" />
          </div>
          <textarea rows={5} placeholder="Your Review" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="detail-comment-bottom">
            <div>
              <span>Please rate: </span>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                <option value={5}>★★★★★</option>
                <option value={4}>★★★★☆</option>
                <option value={3}>★★★☆☆</option>
                <option value={2}>★★☆☆☆</option>
                <option value={1}>★☆☆☆☆</option>
              </select>
            </div>
            <button type="button" onClick={submitReview} disabled={submittingReview}>
              {submittingReview ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </section>

        <section className="detail-related-electro">
          <h3>Related Products</h3>
          <div className="collection-grid">
            {related.slice(0, 4).map((item) => (
              <Link key={item.id} href={`/products/${item.id}`} className="collection-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toMedia(item.primary_image)} alt={item.name} />
                <p className="collection-brand">{item.category_name || "Category"}</p>
                <h3>{item.name}</h3>
                <div className="collection-price-row">
                  <strong>KES {Number(item.discounted_price || item.price).toLocaleString()}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {error && <p className="state-error">{error}</p>}
    </section>
  );
}
