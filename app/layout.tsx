import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Vendor Compliance Guard',
  description: 'Zero-touch inbound compliance verification and document extraction pipeline with Slack alerts.',
  openGraph: {
    title: 'Vendor Compliance Guard',
    description: 'Zero-touch inbound compliance verification and document extraction pipeline with Slack alerts.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vendor Compliance Guard',
    description: 'Zero-touch inbound compliance verification and document extraction pipeline with Slack alerts.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-[#F8FAFC] text-[#0F172A]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
