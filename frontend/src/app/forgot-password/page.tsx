"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { apiRequest } from "@/lib/api";

interface ResetRequestResponse {
  detail: string;
  reset_preview?: {
    link: string;
  };
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [previewLink, setPreviewLink] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setPreviewLink("");

    try {
      const res = await apiRequest<ResetRequestResponse>("/auth/password-reset/request/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res.detail);
      if (res.reset_preview?.link) setPreviewLink(res.reset_preview.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p>Enter your email and we will generate a reset link.</p>
        <form className="form" onSubmit={onSubmit}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} name="email" type="email" placeholder="Email" required />
          <button type="submit">Send Reset Link</button>
        </form>
        {message && <p className="state-success">{message}</p>}
        {error && <p className="state-error">{error}</p>}
        {previewLink && (
          <p>
            Dev reset link: <Link href={previewLink}>Open reset page</Link>
          </p>
        )}
        <p><Link href="/login">Back to login</Link></p>
      </div>
    </section>
  );
}
