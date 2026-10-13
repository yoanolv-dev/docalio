import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_ORG_COOKIE, listMemberships } from "@/lib/organizations";

/**
 * Change l'organisation active (utilisateur membre ou invité de plusieurs
 * organisations). L'appartenance est vérifiée (RLS) avant d'écrire le cookie.
 */
export async function GET(request: NextRequest) {
  const org = request.nextUrl.searchParams.get("org") ?? "";
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const target = next.startsWith("/dashboard") ? next : "/dashboard";

  const memberships = await listMemberships();
  const response = NextResponse.redirect(new URL(target, request.url));
  if (memberships.some((m) => m.organization.id === org)) {
    response.cookies.set(ACTIVE_ORG_COOKIE, org, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
