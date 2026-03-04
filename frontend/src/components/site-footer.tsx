import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="electro-footer">
      <section className="electro-contact-strip">
        <article><h4>Address</h4><p>123 Street, Nairobi</p></article>
        <article><h4>Mail Us</h4><p>info@sonicforge.store</p></article>
        <article><h4>Telephone</h4><p>(+012) 3456 7890</p></article>
        <article><h4>Support</h4><p>support@sonicforge.store</p></article>
      </section>

      <section className="electro-footer-grid">
        <article>
          <h5>Newsletter</h5>
          <p>Get early access to flash deals and new arrivals.</p>
          <div className="electro-newsletter">
            <input placeholder="Enter your email" />
            <button type="button">SignUp</button>
          </div>
        </article>
        <article>
          <h5>Customer Service</h5>
          <Link href="/orders">Order History</Link>
          <Link href="/account">My Account</Link>
          <Link href="/account/addresses">Address Book</Link>
        </article>
        <article>
          <h5>Information</h5>
          <Link href="/special-offers">Special Offers</Link>
          <Link href="/featured-products">Featured Products</Link>
          <Link href="/best-products">Top Selling</Link>
        </article>
        <article>
          <h5>Extras</h5>
          <Link href="/marketplace">Catalog</Link>
          <Link href="/cart">Cart</Link>
          <Link href="/login">Sign In</Link>
        </article>
      </section>

      <div className="electro-footer-bottom">
        <p>© SonicForge, All rights reserved.</p>
        <p>Electro-inspired storefront theme</p>
      </div>
    </footer>
  );
}
