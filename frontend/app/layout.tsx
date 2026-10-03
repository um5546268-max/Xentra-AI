import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import AuthLoader from "@/components/AuthLoader";
import StructuredData from "@/components/StructuredData";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Xentra AI — AI Software for Learning, Coding & More",
    template: "%s | Xentra AI",
  },

  description:
    "Xentra AI is an AI software platform for learning, coding, productivity, and more. Explore Xentra Connect, Xentra Learning, Xentra Code, and upcoming Xentra products.",

  applicationName: "Xentra AI",

  keywords: [
    "Xentra AI",
    "Xentra",
    "Xentra software",
    "Xentra Connect",
    "Xentra Learning",
    "Xentra Code",
    "AI software",
    "AI learning",
    "AI coding",
  ],

  authors: [{ name: "Xentra AI" }],
  creator: "Xentra AI",
  publisher: "Xentra AI",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  alternates: {
    canonical: "https://new.xentraai.uk/",
  },

  openGraph: {
    title: "Xentra AI — AI Software for Learning, Coding & More",
    description:
      "Explore Xentra AI, an AI software platform for learning, coding, productivity, and more.",
    url: "https://new.xentraai.uk/",
    siteName: "Xentra AI",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Xentra AI — AI Software for Learning, Coding & More",
    description:
      "Explore Xentra AI, an AI software platform for learning, coding, productivity, and more.",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xentra AI",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-white antialiased">
        <StructuredData />
        <AuthLoader />
        {children}
        <Toaster />
      </body>
    </html>
  );
}