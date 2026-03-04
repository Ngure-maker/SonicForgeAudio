import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="admin-shell">
      <AdminSidebar />
      <div className="admin-content">{children}</div>
    </section>
  );
}
