import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-950/30 dark:via-background dark:to-brand-900/20 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo-full.svg"
            alt="3LI GLOBAL"
            width={88}
            height={88}
            priority
          />
          <h2 className="mt-3 text-xl font-semibold">MigrationHub</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
