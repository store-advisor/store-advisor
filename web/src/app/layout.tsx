import type { Metadata } from 'next';
import { Lora, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const fontSerif = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
});

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
});

// Covers both surfaces the app serves: the findings dashboard at /dashboard
// and the data cleaning tool at /tool. Per-route metadata overrides this.
export const metadata: Metadata = {
  title: 'Store Advisor',
  description:
    'Finds the money a merchant store is leaking, and stops it. Profiles and cleans tabular data.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'h-full',
        'antialiased',
        'dark',
        fontSerif.variable,
        fontMono.variable,
        'font-sans',
        inter.variable,
      )}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
