"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { apiRequest } from "@/lib/api";
import { Order, WishlistItem } from "@/lib/types";

const statusTabs = [
  { key: "all", label: "All Order" },
  { key: "pre-payment", label: "Pre-payment" },
  { key: "to-be-received", label: "To be Received" },
  { key: "completed", label: "Completed" },
];

function AccountDashboardContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab");
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
      return;
    }
    setActiveTab("all");
  }, [searchParams]);

  useEffect(() => {
    apiRequest<{ results: Order[] }>("/orders/")
      .then((res) => {
        setOrders(res.results);
        setError("");
      })
      .catch((err) => {
        setOrders([]);
        setError(err instanceof Error ? err.message : "Failed to load orders");
      });
  }, []);

  useEffect(() => {
    apiRequest<WishlistItem[] | { results?: WishlistItem[] }>("/auth/wishlist/")
      .then((res) => {
        const list = Array.isArray(res) ? res : res.results || [];
        setWishlist(list);
      })
      .catch(() => setWishlist([]));
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return orders;
    if (activeTab === "pre-payment") {
      return orders.filter((o) => o.status === "pending" || o.payment_status === "pending");
    }
    if (activeTab === "to-be-received") {
      return orders.filter((o) => o.status === "paid" || o.status === "shipped");
    }
    if (activeTab === "completed") {
      return orders.filter((o) => o.status === "delivered");
    }
    return [];
  }, [activeTab, orders]);

  if (activeTab === "wish") {
    return (
      <div className="account-panel">
        <h1 className="account-title">My wish</h1>
        {!wishlist.length ? (
          <div className="account-empty">
            <div className="account-empty-icon">❤</div>
            <h3>No saved items yet</h3>
            <p>Tap hearts in catalog to save products here.</p>
          </div>
        ) : (
          <div className="collection-grid">
            {wishlist.map((item) => (
              <Link key={item.id} href={`/products/${item.product}`} className="collection-card">
                <p className="collection-brand">WISHLIST</p>
                <h3>{item.product_name}</h3>
                <div className="collection-price-row">
                  <strong>KES {Number(item.product_price).toLocaleString()}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (["points", "coupons", "reviews"].includes(activeTab)) {
    return (
      <div className="account-panel">
        <h1 className="account-title">{activeTab.replace("-", " ")}</h1>
        <div className="account-empty">
          <div className="account-empty-icon">🔎</div>
          <h3>OOPS</h3>
          <p>No Result Found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div className="account-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "tab-active" : ""}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "#b11f1f" }}>{error}</p>}

      {filteredOrders.length === 0 ? (
        <div className="account-empty">
          <div className="account-empty-icon">🔍</div>
          <h3>OOPS</h3>
          <p>No Result Found</p>
        </div>
      ) : (
        <div className="account-orders-list">
          {filteredOrders.map((order) => (
            <article key={order.id} className="account-order-card">
              <div>
                <strong>{order.invoice_number}</strong>
                <p>{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p>Status: {order.status}</p>
                <p>Payment: {order.payment_status}</p>
                <p>Total: ${order.total_amount}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountDashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <AccountDashboardContent />
    </Suspense>
  );
}
