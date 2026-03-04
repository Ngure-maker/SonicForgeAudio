"use client";

import Link from "next/link";
import { Suspense } from "react";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiRequest } from "@/lib/api";

function ResetPasswordContent() {
  const params = useSearchParams();
  const uid = useMemo(() => params.get("uid") || "", [params]);
  const token = useMemo(() => params.get("token") || "", [params]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!uid || !token) {
      setError("Invalid reset link. Please request another one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await apiRequest<{ detail: string }>("/auth/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      setMessage(res.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <h1>Create New Password</h1>
        <form className="form" onSubmit={onSubmit}>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="New password" required />
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm password" required />
          <button type="submit">Update Password</button>
        </form>
        {message && <p className="state-success">{message}</p>}
        {error && <p className="state-error">{error}</p>}
        <p><Link href="/login">Return to login</Link></p>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p>Loading reset form...</p>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
