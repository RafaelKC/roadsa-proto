"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Protótipo: use qualquer e-mail e uma senha de 3 dígitos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input key={state.email} id="email" name="email" type="email" placeholder="voce@exemplo.com" defaultValue={state.email} autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" inputMode="numeric" maxLength={3} placeholder="000" autoComplete="current-password" required />
          </div>
          {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
