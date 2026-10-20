import { LoginForm } from "@/app/login/login-form";
import { Brand } from "@/components/brand";
import { TopoBackground } from "@/components/topo-background";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-secondary/20 p-4">
      <TopoBackground />
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="relative w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center"><Brand /></div>
          <p className="text-sm text-muted-foreground">
            Planejador de road trips: monte o roteiro dia a dia, com paradas, horários e custo estimado.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
