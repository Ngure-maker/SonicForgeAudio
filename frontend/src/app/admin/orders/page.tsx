"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface AdminOrder {
  id: number;
  invoice_number: string;
  user_username: string;
  total_amount: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    const res = await apiRequest<{ results: AdminOrder[] }>(`/admin/orders/${query}`);
    setOrders(res.results);
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function updateStatus(orderId: number, status: AdminOrder["status"]) {
    await apiRequest(`/admin/orders/${orderId}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <section>
      <h1>Order Management</h1>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Invoice</th><th>User</th><th>Total</th><th>Status</th><th>Payment</th><th>Update</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.invoice_number}</td>
                <td>{order.user_username}</td>
                <td>${order.total_amount}</td>
                <td>{order.status}</td>
                <td>{order.payment_status}</td>
                <td>
                  {["pending", "paid", "shipped", "delivered", "cancelled"].map((st) => (
                    <button key={st} onClick={() => updateStatus(order.id, st as AdminOrder["status"])}>{st}</button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
