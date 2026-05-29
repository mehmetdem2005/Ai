"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const sb = createClient();
    const { data, error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err || !data.user) {
      setError(err?.message || "Giriş başarısız.");
      setPending(false);
      return;
    }
    const role =
      (data.user.app_metadata as Record<string, unknown> | undefined)?.role;
    if (role !== "admin") {
      setError("Bu hesabın admin yetkisi yok.");
      await sb.auth.signOut();
      setPending(false);
      return;
    }
    router.refresh();
    router.push("/admin");
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>🧬 Sovereign Kokpit</h1>

      <label
        htmlFor="email"
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        E-posta
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
        required
        style={{ marginTop: 6, marginBottom: 12 }}
      />

      <label
        htmlFor="pw"
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Şifre
      </label>
      <input
        id="pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        style={{ marginTop: 6 }}
      />

      <button type="submit" className="primary" disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
      {error && <div className="err">{error}</div>}
    </form>
  );
}
