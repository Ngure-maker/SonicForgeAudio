"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/marketplace", label: "Catalog", icon: "▦" },
  { href: "/cart", label: "Cart", icon: "🛒" },
  { href: "/orders", label: "Orders", icon: "◷" },
  { href: "/account/dashboard", label: "Profile", icon: "👤" },
];

export function MobileTabbar() {
  const pathname = usePathname();

  return (
    <nav className="mobile-tabbar" aria-label="Mobile navigation">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) && item.href !== "/" ? "active" : pathname === item.href ? "active" : ""}>
          <span>{item.icon}</span>
          <small>{item.label}</small>
        </Link>
      ))}
    </nav>
  );
}
