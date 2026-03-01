import TopNav from "@/app/components/top-nav";

export default function DashboardGroupLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
