import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "HostPanel — Hosting Admin",
  description: "Modern hosting management panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-gradient-to-br from-[#F0FDFA] via-white to-[#CCFBF1]">
        <TooltipProvider>
          <Sidebar />
          <div className="ml-[260px] flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
