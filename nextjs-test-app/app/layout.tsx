import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hsafa Agent Test",
  description: "Testing hsafa gateway with assistant-ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-dvh">
        <ThemeProvider defaultTheme="dark" storageKey="hsafa-ui-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
