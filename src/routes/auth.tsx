import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BEBAS, Btn, C, Field, Input, PitchStripes } from "@/components/budget/ui";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Tournament Budget" },
      { name: "description", content: "Sign in to manage your tournament budgets." },
      { property: "og:title", content: "Sign in — Tournament Budget" },
      { property: "og:description", content: "Sign in to manage your tournament budgets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg({ text: error.message, ok: false });
      navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) return setMsg({ text: error.message, ok: false });
      if (data.session) navigate({ to: "/" });
      else setMsg({ text: "Check your email to confirm your account, then sign in.", ok: true });
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Barlow', sans-serif", color: C.text, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <PitchStripes />
      <form onSubmit={submit} style={{
        position: "relative", zIndex: 1, width: "min(420px, 96vw)",
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28,
        boxShadow: `0 0 60px ${C.greenGlow}`,
      }}>
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>⚽ Tournament Budget</div>
        <h1 style={{ fontFamily: BEBAS, fontSize: 30, letterSpacing: "0.05em", color: C.white, textShadow: `0 0 30px ${C.greenGlow}`, margin: "0 0 20px", fontWeight: 400 }}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        </Field>
        {msg && <div style={{ color: msg.ok ? C.green : C.red, fontSize: 12, marginBottom: 14 }}>{msg.text}</div>}
        <Btn type="submit" disabled={busy} style={{ width: "100%", marginBottom: 14 }}>
          {mode === "signin" ? "Sign in" : "Sign up"}
        </Btn>
        <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
          {mode === "signin" ? "No account yet? " : "Already have an account? "}
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
            style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0 }}>
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
