"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface DashboardData {
  total_users: number;
  total_customers: number;
  total_products: number;
  total_orders: number;
  total_sales: number;
  total_revenue: string;
  low_stock_count?: number;
  low_stock_products?: Array<{
    id: number;
    name: string;
    stock_quantity: number;
  }>;
  recent_orders: Array<{
    id: number;
    invoice_number: string;
    user__username: string;
    total_amount: string;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [stockToast, setStockToast] = useState("");

  useEffect(() => {
    async function loadDashboard(silent = false) {
      try {
        const res = await apiRequest<DashboardData>("/admin/dashboard/");
        setData((prev) => {
          if (prev && (res.low_stock_count || 0) > (prev.low_stock_count || 0)) {
            setStockToast("Stock alert: low-stock products increased.");
          }
          return res;
        });
        setError("");
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }

    loadDashboard();
    const interval = window.setInterval(() => loadDashboard(true), 45000);
    return () => window.clearInterval(interval);
  }, []);

  if (error) return <p style={{ color: "#ff8e8e" }}>{error}</p>;
  if (!data) return <p>Loading dashboard...</p>;

  return (
    <section>
      <h1>Dashboard Overview</h1>
      {stockToast && <p className="state-error">{stockToast}</p>}
      <div className="admin-stats-grid">
        <article className="admin-card"><h3>Total Users</h3><p>{data.total_users}</p></article>
        <article className="admin-card"><h3>Total Customers</h3><p>{data.total_customers}</p></article>
        <article className="admin-card"><h3>Total Products</h3><p>{data.total_products}</p></article>
        <article className="admin-card"><h3>Total Orders</h3><p>{data.total_orders}</p></article>
        <article className="admin-card"><h3>Total Sales</h3><p>{data.total_sales}</p></article>
        <article className="admin-card"><h3>Total Revenue</h3><p>${data.total_revenue}</p></article>
      </div>

      <h2>Low Stock Alerts ({data.low_stock_count || 0})</h2>
      {data.low_stock_products?.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Stock</th></tr></thead>
            <tbody>
              {data.low_stock_products.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.stock_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>No low stock products currently.</p>}

      <h2>Recent Orders</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Invoice</th><th>User</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
          <tbody>
            {data.recent_orders.map((row) => (
              <tr key={row.id}>
                <td>#{row.id}</td>
                <td>{row.invoice_number}</td>
                <td>{row.user__username}</td>
                <td>${row.total_amount}</td>
                <td>{row.status}</td>
                <td>{row.payment_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
