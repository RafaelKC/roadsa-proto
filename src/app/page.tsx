import { cookies } from "next/headers";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { Brand } from "@/components/brand";
import { Planner } from "@/components/planner/planner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE } from "@/lib/auth";

export default async function Home() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const email = decodeURIComponent(raw);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b bg-card px-7 py-3.5">
        <Brand />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <ThemeToggle />
          <form action={logout}>
            <Button variant="outline" type="submit"><LogOut /> Sair</Button>
          </form>
        </div>
      </header>
      <Planner />
    </div>
  );
}
