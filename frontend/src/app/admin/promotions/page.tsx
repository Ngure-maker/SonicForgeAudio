"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

interface Promotion {
  id: number;
  title: string;
  subtitle: string;
  cta_text: string;
  target_url: string;
  image?: string | null;
  image_url?: string | null;
  position: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  open_new_tab?: boolean;
}

interface FormState {
  title: string;
  subtitle: string;
  cta_text: string;
  target_url: string;
  position: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  open_new_tab: boolean;
  image: File | null;
}

const INITIAL_FORM: FormState = {
  title: "",
  subtitle: "",
  cta_text: "Shop Now",
  target_url: "/marketplace",
  position: "0",
  starts_at: "",
  ends_at: "",
  is_active: true,
  open_new_tab: false,
  image: null,
};

function toMedia(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${MEDIA_BASE}${url}`;
}

export default function AdminPromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPromotions() {
    try {
      const data = await apiRequest<Promotion[] | { results?: Promotion[] }>("/admin/promotions/");
      setItems(Array.isArray(data) ? data : data.results || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promotions");
    }
  }

  useEffect(() => {
    loadPromotions();
  }, []);

  function startEdit(item: Promotion) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subtitle: item.subtitle || "",
      cta_text: item.cta_text || "Shop Now",
      target_url: item.target_url || "/marketplace",
      position: String(item.position ?? 0),
      starts_at: item.starts_at ? item.starts_at.slice(0, 16) : "",
      ends_at: item.ends_at ? item.ends_at.slice(0, 16) : "",
      is_active: item.is_active,
      open_new_tab: Boolean(item.open_new_tab),
      image: null,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  function appendFormData(fd: FormData) {
    fd.append("title", form.title);
    fd.append("subtitle", form.subtitle);
    fd.append("cta_text", form.cta_text);
    fd.append("target_url", form.target_url);
    fd.append("position", form.position || "0");
    fd.append("is_active", String(form.is_active));
    fd.append("open_new_tab", String(form.open_new_tab));
    if (form.starts_at) fd.append("starts_at", new Date(form.starts_at).toISOString());
    if (form.ends_at) fd.append("ends_at", new Date(form.ends_at).toISOString());
    if (form.image) fd.append("image", form.image);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!form.title.trim() || !form.target_url.trim()) {
      setError("Title and target URL are required.");
      return;
    }

    try {
      const fd = new FormData();
      appendFormData(fd);

      if (editingId) {
        await apiRequest(`/admin/promotions/${editingId}/`, { method: "PATCH", body: fd });
        setMessage("Promotion updated.");
      } else {
        if (!form.image) {
          setError("Image is required for new promotion.");
          return;
        }
        await apiRequest("/admin/promotions/", { method: "POST", body: fd });
        setMessage("Promotion created.");
      }

      resetForm();
      await loadPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  async function removePromotion(id: number) {
    if (!window.confirm("Delete this promotion?")) return;
    try {
      await apiRequest(`/admin/promotions/${id}/`, { method: "DELETE" });
      setMessage("Promotion deleted.");
      await loadPromotions();
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <section>
      <h1>Promotions</h1>
      <p>Manage carousel banners shown on the homepage.</p>

      {message && <p style={{ color: "#2f8c44" }}>{message}</p>}
      {error && <p style={{ color: "#b11f1f" }}>{error}</p>}

      <form className="admin-promo-form" onSubmit={onSubmit}>
        <input value={form.title} placeholder="Title" onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
        <input value={form.subtitle} placeholder="Subtitle" onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <input value={form.cta_text} placeholder="CTA Text" onChange={(e) => setForm((prev) => ({ ...prev, cta_text: e.target.value }))} />
        <input value={form.target_url} placeholder="Target URL, e.g /special-offers" onChange={(e) => setForm((prev) => ({ ...prev, target_url: e.target.value }))} />
        <input value={form.position} type="number" min={0} placeholder="Position" onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))} />

        <label>
          Starts At
          <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))} />
        </label>
        <label>
          Ends At
          <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))} />
        </label>

        <label>
          Banner Image
          <input type="file" accept="image/*" onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.files?.[0] || null }))} />
        </label>

        <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} /> Active</label>
        <label><input type="checkbox" checked={form.open_new_tab} onChange={(e) => setForm((prev) => ({ ...prev, open_new_tab: e.target.checked }))} /> Open in new tab</label>

        <div className="admin-actions-row">
          <button type="submit">{editingId ? "Update Promotion" : "Create Promotion"}</button>
          {editingId && <button type="button" onClick={resetForm}>Cancel Edit</button>}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Banner</th>
              <th>Title</th>
              <th>URL</th>
              <th>Position</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {toMedia(item.image_url || item.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={toMedia(item.image_url || item.image)} alt={item.title} className="admin-promo-thumb" />
                  ) : "-"}
                </td>
                <td>{item.title}</td>
                <td>{item.target_url}</td>
                <td>{item.position}</td>
                <td>{item.is_active ? "Active" : "Inactive"}</td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => startEdit(item)}>Edit</button>
                    <button type="button" onClick={() => removePromotion(item.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
