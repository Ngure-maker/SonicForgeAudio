"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { setTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      username: form.get("username"),
      password: form.get("password"),
    };

    try {
      const json = await apiRequest<{ access: string; refresh: string }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setTokens(json.access, json.refresh);

      const me = await apiRequest<{ role: string }>("/auth/me/");
      if (me.role === "admin") {
        router.push("/admin");
        return;
      }
      router.push("/account/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <h1>Sign In</h1>
        <p>Continue shopping with your SonicForge account.</p>
        <form onSubmit={onSubmit} className="form">
          <input name="username" placeholder="Username" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Sign In</button>
        </form>
        {error && <p className="state-error">{error}</p>}
        <p><Link href="/forgot-password">Forgot password?</Link></p>
        <p>New here? <Link href="/register">Create account</Link></p>
      </div>
    </section>
  );
}
