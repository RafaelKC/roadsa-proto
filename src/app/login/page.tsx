import { LoginForm } from "@/app/login/login-form";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-secondary/20 p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center"><Brand /></div>
        <LoginForm />
      </div>
    </main>
  );
}
