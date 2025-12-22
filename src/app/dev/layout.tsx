import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dev Dashboard - Thunder Text",
  description: "Developer monitoring dashboard",
  robots: "noindex, nofollow",
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {children}
    </div>
  );
}
