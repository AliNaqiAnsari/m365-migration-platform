export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-950/30 dark:via-background dark:to-brand-900/20 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-brand/25">
            <span className="text-lg font-bold text-white">3L</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold">M365 Migration Platform</h2>
          <p className="text-sm text-muted-foreground">by 3LI GLOBAL</p>
        </div>
        {children}
      </div>
    </div>
  );
}
