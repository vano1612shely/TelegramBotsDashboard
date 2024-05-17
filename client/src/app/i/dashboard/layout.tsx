import type { Metadata } from "next";
import Menu from "@/components/menu";
export const metadata: Metadata = {
  title: "Dashboard",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Menu />
      <main className="relative sm:ml-14 p-5">{children}</main>
    </>
  );
}
