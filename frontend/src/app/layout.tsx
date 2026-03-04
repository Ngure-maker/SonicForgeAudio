import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

import { MobileTabbar } from "@/components/mobile-tabbar";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
      title: "SonicForge",
  description: "Electro-style ecommerce platform",
  icons: {
    icon: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={openSans.className}>
        <Navbar />
        <main className="container">{children}</main>
        <SiteFooter />
        <MobileTabbar />
      </body>
    </html>
  );
}
