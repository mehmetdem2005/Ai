// Legacy şifre auth endpoint'i — artık kullanılmıyor (Supabase Auth client-side).
// Eski yer imlerinden gelirse login sayfasına yönlendir.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.redirect(`${new URL(req.url).origin}/`, { status: 303 });
}
