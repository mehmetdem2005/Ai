import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await isAdmin()) {
    redirect("/admin");
  }
  return (
    <div className="login">
      <LoginForm />
    </div>
  );
}
