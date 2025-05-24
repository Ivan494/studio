import type {Metadata} from 'next';
import { Geist_Sans as GeistSans } from 'next/font/google'; // Correct import for Geist Sans
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = GeistSans({ // Correct initialization
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LinguaLens',
  description: 'AI-Powered Text Translation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
