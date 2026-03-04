"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";

interface Category {
  id: number;
  name: string;
  slug: string;
  products_count?: number;
}

interface CategoryResponse {
  results?: Category[];
}

interface Me {
  username: string;
  role: "customer" | "admin";
  avatar?: string | null;
}

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

function avatarUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${MEDIA_BASE}${path}`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsAuthed(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await apiRequest<Category[] | CategoryResponse>("/categories/");
        const list = Array.isArray(data) ? data : data.results || [];
        setCategories(list);
      } catch {
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      setMe(null);
      return;
    }
    apiRequest<Me>("/auth/me/")
      .then((res) => setMe(res))
      .catch(() => setMe(null));
  }, [isAuthed]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function onLogout() {
    clearTokens();
    setIsAuthed(false);
    setProfileOpen(false);
    router.push("/login");
  }

  function onSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/marketplace?search=${encodeURIComponent(q)}` : "/marketplace");
  }

  return (
    <header id="header" className="site-header fixed">
      <div className="electro-topbar">
        <div className="electro-top-inner">
          <p>Help / Support / Contact</p>
          <p>Call Us: (+012) 1234 567890</p>
          <p className="hide-sm">USD • English • My Dashboard</p>
        </div>
      </div>

      <div className="electro-middle">
        <div className="electro-middle-inner">
          <Link href="/" className="electro-logo">
            <span className="electro-logo-bag">👜</span>
            <span>Electro</span>
          </Link>

          <form className="electro-search" onSubmit={onSearchSubmit}>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search Looking For?"
            />
            <select aria-label="Category selector">
              <option>All Category</option>
              {categories.map((cat) => <option key={cat.id}>{cat.name}</option>)}
            </select>
            <button type="submit">⌕</button>
          </form>

          <div className="electro-actions">
            <Link href="/marketplace" aria-label="Compare">⇄</Link>
            <Link href="/account/dashboard?tab=wish" aria-label="Wishlist">♥</Link>
            <Link href="/cart" aria-label="Cart">🛒</Link>
            <span className="hide-sm">$0.00</span>
          </div>
        </div>
      </div>

      <div className="electro-nav-bar">
        <div className="electro-nav-inner">
          <nav className="electro-nav">
            <Link href="/" className={pathname === "/" ? "sf-active" : ""}>Home</Link>
            <Link href="/marketplace" className={pathname === "/marketplace" ? "sf-active" : ""}>Products</Link>
            <Link href="/special-offers">Special Offer</Link>
            <Link href="/featured-products">Featured</Link>
            <Link href="/best-products">Top Selling</Link>
          </nav>

          <div className="nav-actions">
            <Link href="/orders" className="hide-sm">Orders</Link>
            <Link href="/register" className="hide-sm">Register</Link>
            {mounted && isAuthed ? (
              <div
                ref={profileRef}
                className="profile-wrap"
              >
                <button
                  className="profile-trigger"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((prev) => !prev)}
                >
                  {avatarUrl(me?.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="profile-avatar" src={avatarUrl(me?.avatar) || ""} alt="Profile" />
                  ) : "👤"}
                </button>
                {profileOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-name">{me?.username || "My Account"}</div>
                    <div className="profile-links">
                      <Link href="/account/dashboard" onClick={() => setProfileOpen(false)}><span>📦</span> My Order</Link>
                      <Link href="/account" onClick={() => setProfileOpen(false)}><span>👤</span> Personal Information</Link>
                      <Link href="/account/dashboard?tab=wish" onClick={() => setProfileOpen(false)}><span>❤</span> My Wish</Link>
                      <Link href="/account/dashboard?tab=points" onClick={() => setProfileOpen(false)}><span>⭐</span> My Explorer Points</Link>
                      <Link href="/account/dashboard?tab=coupons" onClick={() => setProfileOpen(false)}><span>🎟</span> Coupons Center</Link>
                      <Link href="/account/addresses" onClick={() => setProfileOpen(false)}><span>📍</span> Address Management</Link>
                      <Link href="/account/dashboard?tab=reviews" onClick={() => setProfileOpen(false)}><span>📝</span> Product Reviews</Link>
                    </div>
                    <div className="profile-divider" />
                    <button className="profile-logout" type="button" onClick={onLogout}>
                      <span>↩</span> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : <Link href="/login">Login</Link>}
          </div>
        </div>
      </div>
    </header>
  );
}
