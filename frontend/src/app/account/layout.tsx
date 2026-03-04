import Link from "next/link";

import { AccountSidebar } from "@/components/account/sidebar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="account-shell">
      <div className="account-breadcrumb">
        <Link href="/">HOME</Link>
        <span>»</span>
        <span>My Order</span>
      </div>
      <div className="account-body">
        <AccountSidebar />
        <div className="account-main">{children}</div>
      </div>
    </section>
  );
}
