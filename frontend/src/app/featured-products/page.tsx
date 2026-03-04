import { ProductCollection } from "@/components/product-collection";

export default function FeaturedProductsPage() {
  return (
    <section className="collection-shell">
      <header className="collection-head">
        <p>SonicForge Curated</p>
        <h1>Featured Products</h1>
        <span>Editor-picked items highlighted by our team.</span>
      </header>
      <ProductCollection kind="featured" />
    </section>
  );
}
