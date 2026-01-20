import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/components/query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'M365 Migration - Tenant-to-Tenant Migration Platform',
  description:
    'Seamlessly migrate users, emails, files, and more between Microsoft 365 and Google Workspace tenants.',
  keywords: [
    'Microsoft 365',
    'Office 365',
    'Google Workspace',
    'Migration',
    'Tenant Migration',
    'Email Migration',
    'SharePoint Migration',
    'Teams Migration',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
