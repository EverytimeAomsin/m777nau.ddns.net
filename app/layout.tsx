// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "M107 Ballistic Computer",
  description: "Field Artillery Ballistic Data System",
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
