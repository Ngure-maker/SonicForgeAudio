"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainLinks = [
  { href: "/account/dashboard", label: "My Order" },
  { href: "/account", label: "Personal Information" },
  { href: "/account/addresses", label: "Address Management" },
];

const extraLinks = [
  { href: "/account/dashboard?tab=wish", label: "My Wish" },
  { href: "/account/dashboard?tab=points", label: "My Explorer Point" },
  { href: "/account/dashboard?tab=coupons", label: "Coupons Center" },
  { href: "/account/dashboard?tab=reviews", label: "Product Reviews" },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="account-sidebar">
      <h2>Transaction Management</h2>
      <nav className="account-links">
        {mainLinks.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="account-divider" />
      <nav className="account-links account-links-muted">
        {extraLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
