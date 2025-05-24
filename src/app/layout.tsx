import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Switch to Inter font
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const inter = Inter({ // Initialize Inter font
  variable: '--font-inter', // Update font variable name
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
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
