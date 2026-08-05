import type { Metadata } from "next";
import "@fontsource-variable/google-sans";
import "./globals.css";
import { Providers } from "./providers";
import { SiteFooter } from "@/components/shared/site-footer";

export const metadata: Metadata = {
  title: "Campus Maintenance Complaint Management System (LASU)",
  description:
    "Web-based platform for campus maintenance complaints at LASU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <SiteFooter />
      </body>
    </html>
  );
}
