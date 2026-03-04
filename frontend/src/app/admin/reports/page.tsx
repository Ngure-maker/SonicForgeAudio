"use client";

import { useEffect, useState } from "react";

import { apiRequest, apiRequestBlob } from "@/lib/api";

interface ReportsData {
  revenue_per_month: Array<{ month: string; revenue: string }>;
  revenue_per_category: Array<{ product__category__name: string | null; revenue: string }>;
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => {
    apiRequest<ReportsData>("/admin/reports/").then(setData);
  }, []);

  async function download(path: string, filename: string) {
    const blob = await apiRequestBlob(path, { method: "GET" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h1>Reports & Analytics</h1>
      <div className="admin-actions-row">
        <button onClick={() => download("/admin/reports/export/orders/", "orders_export.csv")}>Export Orders CSV</button>
        <button onClick={() => download("/admin/reports/export/users/", "users_export.csv")}>Export Users CSV</button>
      </div>
      <h2>Revenue Per Month</h2>
      <ul>
        {data?.revenue_per_month.map((row, idx) => (
          <li key={idx}>{String(row.month).slice(0, 10)}: ${row.revenue}</li>
        ))}
      </ul>

      <h2>Revenue Per Category</h2>
      <ul>
        {data?.revenue_per_category.map((row, idx) => (
          <li key={idx}>{row.product__category__name || "Uncategorized"}: ${row.revenue}</li>
        ))}
      </ul>
    </section>
  );
}
