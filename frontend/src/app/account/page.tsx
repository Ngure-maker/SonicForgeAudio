"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

interface Me {
  id: number;
  username: string;
  email: string;
  role: "customer" | "admin";
  is_active: boolean;
  is_suspended: boolean;
  avatar?: string | null;
}

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "http://127.0.0.1:8001";

function avatarUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${MEDIA_BASE}${path}`;
}

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await apiRequest<Me>("/auth/me/");
      setMe(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load profile");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const selected = form.get("avatar");
    if (!(selected instanceof File) || selected.size === 0) {
      form.delete("avatar");
    }

    try {
      const updated = await apiRequest<Me>("/auth/me/", {
        method: "PATCH",
        body: form,
      });
      setMe(updated);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  if (!me) return <p>{message || "Loading profile..."}</p>;

  return (
    <section className="account-page-content">
      <h1 className="account-page-title">Personal Information</h1>
      <p className="account-page-subtitle">Manage your profile and addresses used in checkout.</p>

      <div className="account-avatar-block">
        {avatarUrl(me.avatar) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="account-avatar-preview" src={avatarUrl(me.avatar) || ""} alt="Profile" />
        ) : (
          <div className="account-avatar-fallback">👤</div>
        )}
      </div>

      <form className="account-form" onSubmit={updateProfile}>
        <input name="username" defaultValue={me.username} required placeholder="Username" />
        <input name="email" defaultValue={me.email} type="email" required placeholder="Email" />
        <label className="account-file-label" htmlFor="avatar">Profile image</label>
        <input id="avatar" name="avatar" type="file" accept="image/*" />
        <button type="submit">Save Profile</button>
      </form>

      <div style={{ marginTop: "1rem" }}>
        <p>Role: {me.role}</p>
        <p>Status: {me.is_active ? "Active" : "Inactive"}</p>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem" }}>
        <Link href="/account/addresses">Manage Addresses</Link>
        <Link href="/cart">Go To Checkout</Link>
      </div>

      {message && <p>{message}</p>}
    </section>
  );
}
