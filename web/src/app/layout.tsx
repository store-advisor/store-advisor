import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const fontSerif = Lora({
    subsets: ["latin"],
    variable: "--font-serif",
});

const fontMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: "Store Advisor — AI Data Cleaning",
    description: "Upload a raw dataset and clean it with Basic, Advanced, or Agent AI pipelines.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={cn("h-full", "antialiased", "dark", fontSerif.variable, fontMono.variable, "font-sans", inter.variable)} suppressHydrationWarning>
            <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
