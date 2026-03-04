"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { Address } from "@/lib/types";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const res = await apiRequest<{ results?: Address[] } | Address[]>("/auth/addresses/");
      const list = Array.isArray(res) ? res : res.results || [];
      setAddresses(list);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load addresses");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      await apiRequest("/auth/addresses/", {
        method: "POST",
        body: JSON.stringify({
          address_type: form.get("address_type"),
          full_name: form.get("full_name"),
          phone_number: form.get("phone_number"),
          line1: form.get("line1"),
          line2: form.get("line2") || "",
          city: form.get("city"),
          state: form.get("state"),
          postal_code: form.get("postal_code"),
          country: form.get("country"),
          is_default: form.get("is_default") === "on",
        }),
      });
      formEl.reset();
      await load();
      setMessage("Address added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add address");
    }
  }

  async function removeAddress(id: number) {
    try {
      await apiRequest(`/auth/addresses/${id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete address");
    }
  }

  async function setDefault(address: Address) {
    try {
      await apiRequest(`/auth/addresses/${address.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          address_type: address.address_type,
          full_name: address.full_name,
          phone_number: address.phone_number,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country,
          is_default: true,
        }),
      });
      await load();
      setMessage("Default address updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to set default");
    }
  }

  return (
    <section className="account-page-content">
      <h1 className="account-page-title">Address Management</h1>

      <form className="account-form account-form-wide" onSubmit={createAddress}>
        <select name="address_type" defaultValue="shipping" required>
          <option value="shipping">Shipping</option>
          <option value="billing">Billing</option>
        </select>
        <input name="full_name" required placeholder="Full name" />
        <input name="phone_number" required placeholder="Phone number" />
        <input name="line1" required placeholder="Address line 1" />
        <input name="line2" placeholder="Address line 2 (optional)" />
        <input name="city" required placeholder="City" />
        <input name="state" required placeholder="State/Region" />
        <input name="postal_code" required placeholder="Postal code" />
        <input name="country" required placeholder="Country" defaultValue="Kenya" />
        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input name="is_default" type="checkbox" />
          Set as default
        </label>
        <button type="submit">Add Address</button>
      </form>

      <div style={{ marginTop: "1rem" }}>
        {addresses.map((address) => (
          <article key={address.id} className="account-order-card" style={{ marginBottom: "0.8rem" }}>
            <div>
              <h3>
                {address.full_name} ({address.address_type}) {address.is_default ? "- Default" : ""}
              </h3>
              <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
              <p>{address.city}, {address.state}, {address.postal_code}, {address.country}</p>
              <p>{address.phone_number}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!address.is_default && <button onClick={() => setDefault(address)}>Set Default</button>}
                <button onClick={() => removeAddress(address.id)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {message && <p>{message}</p>}
    </section>
  );
}
