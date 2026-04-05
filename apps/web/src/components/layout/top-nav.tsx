"use client";

import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const { setMobileOpen } = useSidebarStore();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/50 bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <div className="h-6 w-px bg-border/50" />

        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
