import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center">
      <SignUp
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
