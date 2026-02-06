import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import CGProvider from "@/components/CGProvider";

export const metadata: Metadata = {
  title: "Unity Chant",
  description: "Scalable direct democracy voting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-muted animate-pulse">Loading Unity Chant...</div>
          </div>
        }>
          <CGProvider>
            {children}
          </CGProvider>
        </Suspense>
      </body>
    </html>
  );
}
