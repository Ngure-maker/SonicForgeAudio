"use client";

import { useEffect, useState } from "react";

import { apiRequest, apiRequestBlob } from "@/lib/api";
import { Order } from "@/lib/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<string[]>([]);

  async function loadOrders(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await apiRequest<{ results: Order[] }>("/orders/");
      setOrders((prev) => {
        if (prev.length) {
          const prevMap = new Map(prev.map((o) => [o.id, o.status]));
          const updates = res.results
            .filter((o) => prevMap.has(o.id) && prevMap.get(o.id) !== o.status)
            .map((o) => `Order ${o.invoice_number} is now ${o.status}.`);
          if (updates.length) {
            setNotifications((current) => [...updates, ...current].slice(0, 4));
          }
        }
        return res.results;
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = window.setInterval(() => loadOrders(true), 30000);
    return () => window.clearInterval(interval);
  }, []);

  async function downloadInvoice(orderId: number, invoiceNumber: string) {
    try {
      const blob = await apiRequestBlob(`/orders/${orderId}/invoice/`, { method: "GET" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invoice download failed.");
    }
  }

  async function cancelOrder(orderId: number) {
    try {
      await apiRequest(`/orders/${orderId}/cancel/`, { method: "POST" });
      setMessage("Order cancelled.");
      await loadOrders();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  return (
    <section>
      <h1>Orders</h1>
      {!!notifications.length && (
        <div className="toast-stack">
          {notifications.map((note, idx) => (
            <div key={`${note}-${idx}`} className="toast-note">
              {note}
            </div>
          ))}
        </div>
      )}
      {loading && <p>Loading orders...</p>}
      {error && <p className="state-error">{error}</p>}
      {!loading && !orders.length && (
        <div className="collection-empty">
          <p>No orders yet.</p>
        </div>
      )}
      {orders.map((order) => (
        <article key={order.id} className="product-card" style={{ marginBottom: "1rem" }}>
          <div>
            <h3>{order.invoice_number} - {order.status}</h3>
            <p>Total: ${order.total_amount}</p>
            <p>Payment: {order.payment_status}</p>
            <div className="order-timeline">
              {["pending", "paid", "shipped", "delivered"].map((step) => (
                <span
                  key={`${order.id}-${step}`}
                  className={
                    order.status === step || (order.status === "cancelled" && step === "pending")
                      ? "active"
                      : ""
                  }
                >
                  {step}
                </span>
              ))}
              {order.status === "cancelled" && <span className="cancelled">cancelled</span>}
            </div>
            {order.items.map((item) => (
              <div key={item.id} style={{ marginBottom: "0.5rem" }}>
                <span>
                  {item.product_name} ({item.variant_label || "Standard"}) x{item.quantity} - ${item.line_total}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem" }}>
              <button onClick={() => downloadInvoice(order.id, order.invoice_number)}>Download Invoice</button>
              {(order.status === "pending" || order.status === "paid") && (
                <button onClick={() => cancelOrder(order.id)}>Cancel</button>
              )}
            </div>
          </div>
        </article>
      ))}
      {message && <p>{message}</p>}
    </section>
  );
}
