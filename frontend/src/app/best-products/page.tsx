import { ProductCollection } from "@/components/product-collection";

export default function BestProductsPage() {
  return (
    <section className="collection-shell">
      <header className="collection-head">
        <p>SonicForge Picks</p>
        <h1>Best Products</h1>
        <span>Popular products with strong stock and demand.</span>
      </header>
      <ProductCollection kind="best" />
    </section>
  );
}
