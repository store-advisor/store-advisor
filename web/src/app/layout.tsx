import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Store Advisor',
  description:
    'Finds the money a merchant store is leaking, and stops it.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-zinc-950 font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
