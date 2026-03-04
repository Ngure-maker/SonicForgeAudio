"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface Brand {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  is_active: boolean;
}

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

function toMedia(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${MEDIA_BASE}${path}`;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);

  async function load() {
    const res = await apiRequest<{ results: Brand[] }>("/admin/brands/");
    setBrands(res.results);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    await apiRequest("/admin/brands/", {
      method: "POST",
      body: form,
    });
    formEl.reset();
    await load();
  }

  async function remove(id: number) {
    await apiRequest(`/admin/brands/${id}/`, { method: "DELETE" });
    await load();
  }

  async function toggleActive(brand: Brand) {
    await apiRequest(`/admin/brands/${brand.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !brand.is_active }),
    });
    await load();
  }

  return (
    <section>
      <h1>Brand Management</h1>
      <form className="form" onSubmit={create}>
        <input name="name" required placeholder="Brand name" />
        <input name="logo" type="file" accept="image/*" />
        <button>Create Brand</button>
      </form>
      <div className="admin-table-wrap" style={{ marginTop: "1rem" }}>
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Logo</th><th>Name</th><th>Slug</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td>{brand.id}</td>
                <td>
                  {brand.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={toMedia(brand.logo)} alt={brand.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
                  ) : "—"}
                </td>
                <td>{brand.name}</td>
                <td>{brand.slug}</td>
                <td>{brand.is_active ? "Yes" : "No"}</td>
                <td>
                  <button onClick={() => toggleActive(brand)}>{brand.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => remove(brand.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
