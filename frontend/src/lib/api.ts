"use client";

import { clearTokens, getAccessToken } from "@/lib/auth";

const API_BASE_URL = "/api/proxy";

function extractErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Request failed";
  const data = err as Record<string, unknown>;
  if (typeof data.detail === "string") return data.detail;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return "Request failed";
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});

  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Request failed" }));
    const detail = extractErrorMessage(err);
    if (detail.toLowerCase().includes("token not valid")) {
      clearTokens();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function apiRequestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Request failed" }));
    const detail = extractErrorMessage(err);
    if (detail.toLowerCase().includes("token not valid")) {
      clearTokens();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(detail);
  }
  return response.blob();
}
