import Link from "next/link";

import { Product } from "@/lib/types";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://localhost:8001";

export function ProductCard({ product }: { product: Product }) {
  const imageUrl = product.primary_image
    ? `${MEDIA_BASE}${product.primary_image}`
    : "https://placehold.co/640x480?text=Product";

  const displayPrice = product.discounted_price || product.price;

  return (
    <article className="product-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={product.name} />
      <div>
        <h3>{product.name}</h3>
        <p>{product.category_name || "General"}</p>
        <p>${displayPrice}</p>
        <Link href={`/products/${product.id}`}>View Product</Link>
      </div>
    </article>
  );
}
