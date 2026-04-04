import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border-0",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "border-border",
            formButtonPrimary: "bg-brand-gradient hover:opacity-90",
            footerActionLink: "text-brand hover:text-brand-light",
          },
        }}
      />
    </div>
  );
}
