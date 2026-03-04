"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface AdminProduct {
  id: number;
  name: string;
  description: string;
  sku: string;
  category: number;
  category_name: string;
  brand: number;
  brand_name: string;
  stock_quantity: number;
  price: string;
  discounted_price: string | null;
  is_active: boolean;
  images?: Array<{ id: number; image: string; alt_text: string; is_primary: boolean }>;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface BrandOption {
  id: number;
  name: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);

  async function load() {
    const [productsRes, categoriesRes, brandsRes] = await Promise.all([
      apiRequest<{ results: AdminProduct[] }>("/admin/products/"),
      apiRequest<{ results: CategoryOption[] }>("/admin/categories/"),
      apiRequest<{ results: BrandOption[] }>("/admin/brands/"),
    ]);
    setProducts(productsRes.results);
    setCategories(categoriesRes.results);
    setBrands(brandsRes.results);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const created = await apiRequest<AdminProduct>("/admin/products/", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || "",
        sku: String(form.get("sku") || "").trim() || undefined,
        category: Number(form.get("category")),
        brand: Number(form.get("brand")),
        price: form.get("price"),
        discounted_price: form.get("discounted_price") || null,
        stock_quantity: Number(form.get("stock_quantity")),
        is_active: true,
      }),
    });

    const selectedFiles = form.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
    if (selectedFiles.length > 0) {
      const uploadForm = new FormData();
      selectedFiles.forEach((file) => uploadForm.append("images", file));
      await apiRequest(`/admin/products/${created.id}/images/`, {
        method: "POST",
        body: uploadForm,
      });
    }

    formEl.reset();
    await load();
  }

  async function remove(id: number) {
    await apiRequest(`/admin/products/${id}/`, { method: "DELETE" });
    await load();
  }

  async function setInventory(id: number, current: number) {
    const raw = prompt("Set stock quantity", String(current));
    if (!raw) return;
    const qty = Number(raw);
    if (Number.isNaN(qty) || qty < 0) return;
    await apiRequest(`/admin/products/${id}/inventory/`, {
      method: "PATCH",
      body: JSON.stringify({ stock_quantity: qty }),
    });
    await load();
  }

  async function toggleActive(product: AdminProduct) {
    await apiRequest(`/admin/products/${product.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    await load();
  }

  return (
    <section>
      <h1>Product Management</h1>

      <form className="form" onSubmit={create} style={{ marginBottom: "1rem", maxWidth: "720px" }}>
        <input name="name" required placeholder="Product name" />
        <input name="sku" placeholder="SKU (optional, auto-generated if empty)" />
        <textarea name="description" placeholder="Description" rows={4} />
        <select name="category" required defaultValue="">
          <option value="" disabled>Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="brand" required defaultValue="">
          <option value="" disabled>Select brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input name="price" type="number" step="0.01" min="0" required placeholder="Price" />
        <input name="discounted_price" type="number" step="0.01" min="0" placeholder="Discounted price (optional)" />
        <input name="stock_quantity" type="number" min="0" required placeholder="Stock quantity" />
        <input name="images" type="file" accept="image/*" multiple />
        <button type="submit">Create Product</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Name</th><th>SKU</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.sku}</td>
                <td>{product.category_name}</td>
                <td>{product.brand_name}</td>
                <td>${product.discounted_price || product.price}</td>
                <td>{product.stock_quantity}</td>
                <td>{product.is_active ? "Yes" : "No"}</td>
                <td>
                  <button onClick={() => setInventory(product.id, product.stock_quantity)}>Inventory</button>
                  <button onClick={() => toggleActive(product)}>{product.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => remove(product.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
