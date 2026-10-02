import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xentra AI — Your AI Agent',
  description: 'Xentra AI is coming January 1, 2027.',
  icons: { icon: '/images/xentra-logo.png' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
