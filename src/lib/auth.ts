// Login FAKE (MVP acadêmico): qualquer e-mail + senha de 3 dígitos.
// Não há backend nem usuário real — só um cookie marcando a sessão por 30 min.
export const SESSION_COOKIE = "roadsa_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^\d{3}$/;

export function validateCredentials(email: string, password: string): string | null {
  if (!EMAIL_RE.test(email)) return "Informe um e-mail válido.";
  if (!PASSWORD_RE.test(password)) return "A senha deve ter exatamente 3 dígitos.";
  return null;
}
