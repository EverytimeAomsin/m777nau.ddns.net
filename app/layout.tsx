// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Nautilus arma Ballistic Computer",
  description: "TOFTS M777 Field Artillery Ballistic Data System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
