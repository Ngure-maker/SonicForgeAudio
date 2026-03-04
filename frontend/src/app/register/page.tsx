"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const [result, setResult] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      username: form.get("username"),
      email: form.get("email"),
      password: form.get("password"),
    };

    try {
      await apiRequest("/auth/register/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult("Registration successful. Proceed to login.");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed to register.");
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p>Start your mobile shopping journey on SonicForge.</p>
        <form onSubmit={onSubmit} className="form">
          <input name="username" required placeholder="Username" />
          <input name="email" type="email" required placeholder="Email" />
          <input name="password" type="password" required placeholder="Password" />
          <button type="submit">Register</button>
        </form>
        {result && (
          <p className={result.toLowerCase().includes("successful") ? "state-success" : "state-error"}>
            {result}
          </p>
        )}
        <p>Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </section>
  );
}
