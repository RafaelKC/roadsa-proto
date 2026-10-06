"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  // Os dois ícones ficam no DOM e o CSS (classe .dark) escolhe qual aparece — evita mismatch de hidratação.
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Alternar tema claro/escuro"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
