import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-950/30 dark:via-background dark:to-brand-900/20 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo-icon.svg"
            alt="3LI GLOBAL"
            width={56}
            height={56}
            className="shadow-lg shadow-brand/25 rounded-xl"
          />
          <h2 className="mt-4 text-xl font-semibold">MigrationHub</h2>
          <p className="text-sm text-muted-foreground">by 3LI GLOBAL</p>
        </div>
        {children}
      </div>
    </div>
  );
}
