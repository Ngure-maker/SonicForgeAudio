"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface Category {
  id: number;
  name: string;
  slug?: string;
  parent: number | null;
  sort_order: number;
  products_count: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  async function load() {
    const res = await apiRequest<{ results: Category[] }>("/admin/categories/");
    setCategories(res.results);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    await apiRequest("/admin/categories/", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        parent: form.get("parent") ? Number(form.get("parent")) : null,
      }),
    });
    formEl.reset();
    await load();
  }

  async function remove(id: number) {
    await apiRequest(`/admin/categories/${id}/`, { method: "DELETE" });
    await load();
  }

  async function reorder() {
    await apiRequest("/admin/categories/reorder/", {
      method: "PATCH",
      body: JSON.stringify({ category_ids: categories.map((c) => c.id) }),
    });
    await load();
  }

  return (
    <section>
      <h1>Category Management</h1>
      <form className="form" onSubmit={create}>
        <input name="name" required placeholder="Name" />
        <select name="parent" defaultValue="">
          <option value="">No parent</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button>Create</button>
      </form>
      <button onClick={reorder}>Save Current Order</button>
      <ul>
        {categories.map((c, idx) => (
          <li key={c.id}>
            {idx + 1}. {c.name} ({c.products_count})
            <button disabled={idx === 0} onClick={() => setCategories((prev) => {
              const arr = [...prev];
              [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
              return arr;
            })}>Up</button>
            <button disabled={idx === categories.length - 1} onClick={() => setCategories((prev) => {
              const arr = [...prev];
              [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
              return arr;
            })}>Down</button>
            <button onClick={() => remove(c.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
