import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Hostel Management",
  description: "Next.js 14 app scaffold with Prisma and Tailwind CSS"
};

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("theme-preference");
    const theme = stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.setAttribute("data-theme", resolved);
  } catch {}
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
