"use client";
import { useState } from "react";

export default function LoginForm({ error }: { error: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      method="POST"
      action="/api/auth"
      onSubmit={() => setPending(true)}
    >
      <h1>🧬 Sovereign Kokpit</h1>
      <label htmlFor="pw" style={{ fontSize: 12, color: "var(--text-dim)" }}>
        Şifre
      </label>
      <input
        id="pw"
        type="password"
        name="password"
        autoFocus
        required
        style={{ marginTop: 6 }}
      />
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
      {error && <div className="err">Yanlış şifre.</div>}
    </form>
  );
}
