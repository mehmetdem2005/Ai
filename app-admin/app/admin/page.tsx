import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getPendingItems,
  oldestPendingAgeHours,
  supabaseConfigured,
} from "@/lib/supabase";
import PanelClient from "./PanelClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin") {
    return (
      <div className="layout">
        <div className="main">
          <h2>⛔ Erişim engellendi</h2>
          <p className="subtitle">
            <code>{user.email}</code> hesabının admin yetkisi yok. Yetki almak için
            sistem yöneticisiyle iletişime geç.
          </p>
          <form method="POST" action="/api/logout">
            <button type="submit">Çıkış yap</button>
          </form>
        </div>
      </div>
    );
  }

  if (!supabaseConfigured()) {
    return (
      <div className="layout">
        <div className="main">
          <h2>⚠️ Supabase bağlı değil</h2>
          <p className="subtitle">
            <code>SUPABASE_URL</code> ve <code>SUPABASE_KEY</code> ortam değişkenlerini
            ekleyip yeniden deploy et.
          </p>
        </div>
      </div>
    );
  }

  const [pending, oldestAge] = await Promise.all([
    getPendingItems(),
    oldestPendingAgeHours(),
  ]);

  const autoHours = Number(process.env.AUTO_PUBLISH_AFTER_HOURS ?? "24");

  return (
    <PanelClient
      pending={pending}
      oldestAgeHours={oldestAge}
      autoHours={autoHours}
      userEmail={user.email ?? ""}
    />
  );
}
