import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="ml-[260px] flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </>
  );
}
