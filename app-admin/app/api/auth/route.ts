import { NextResponse } from "next/server";
import { checkPassword, login } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const pw = String(form.get("password") ?? "");
  const origin = new URL(req.url).origin;
  if (!checkPassword(pw)) {
    return NextResponse.redirect(`${origin}/?err=1`, { status: 303 });
  }
  await login();
  return NextResponse.redirect(`${origin}/admin`, { status: 303 });
}
