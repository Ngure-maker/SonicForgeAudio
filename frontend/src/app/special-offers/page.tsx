import { ProductCollection } from "@/components/product-collection";

export default function SpecialOffersPage() {
  return (
    <section className="collection-shell">
      <header className="collection-head">
        <p>SonicForge Promotions</p>
        <h1>Special Offers</h1>
        <span>Discounted products picked for value shoppers.</span>
      </header>
      <ProductCollection kind="special" />
    </section>
  );
}
