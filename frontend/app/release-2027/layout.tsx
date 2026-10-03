import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xentra AI 2027 Release",
  description:
    "Learn about the upcoming Xentra AI 2027 release, including Xentra Connect, Xentra Learning, Xentra Code, and future Xentra products.",
  alternates: {
    canonical: "https://new.xentraai.uk/release-2027",
  },
  openGraph: {
    title: "Xentra AI 2027 Release",
    description:
      "Learn about the upcoming Xentra AI 2027 release and future Xentra products.",
    url: "https://new.xentraai.uk/release-2027",
    siteName: "Xentra AI",
    type: "website",
  },
};

export default function Release2027Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}