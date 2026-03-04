"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "customer" | "admin";
  is_active: boolean;
  is_suspended: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await apiRequest<{ results: AdminUser[] }>(`/admin/users/?search=${encodeURIComponent(search)}`);
      setUsers(res.results);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  async function suspend(userId: number, isSuspended: boolean) {
    await apiRequest(`/admin/users/${userId}/suspend/`, {
      method: "PATCH",
      body: JSON.stringify({ is_suspended: isSuspended }),
    });
    await load();
  }

  async function setRole(userId: number, role: "customer" | "admin") {
    await apiRequest(`/admin/users/${userId}/set-role/`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    await load();
  }

  async function remove(userId: number) {
    await apiRequest(`/admin/users/${userId}/`, { method: "DELETE" });
    await load();
  }

  return (
    <section>
      <h1>User Management</h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
      {error && <p style={{ color: "#ff8e8e" }}>{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? "Active" : "Suspended"}</td>
                <td>
                  <button onClick={() => suspend(user.id, !user.is_suspended)}>{user.is_suspended ? "Activate" : "Suspend"}</button>
                  <button onClick={() => setRole(user.id, user.role === "admin" ? "customer" : "admin")}>
                    Make {user.role === "admin" ? "Customer" : "Admin"}
                  </button>
                  <button onClick={() => remove(user.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
