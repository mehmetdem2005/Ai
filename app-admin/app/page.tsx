import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  if (await isLoggedIn()) {
    redirect("/admin");
  }
  const sp = await searchParams;
  return (
    <div className="login">
      <LoginForm error={sp.err === "1"} />
    </div>
  );
}
