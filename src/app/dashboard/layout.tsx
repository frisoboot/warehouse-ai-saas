import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 pt-16 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
