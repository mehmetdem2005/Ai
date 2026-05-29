import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import {
  getPendingItems,
  oldestPendingAgeHours,
  supabaseConfigured,
} from "@/lib/supabase";
import PanelClient from "./PanelClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isLoggedIn())) redirect("/");

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
    />
  );
}
