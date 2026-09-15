import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * LMS areas that need a role, checked before Next.js resolves the route.
 *
 * Mirrors the client guards in each area's layout.tsx. Those still run - this
 * is a second layer, so a teacher never receives the admin bundle at all
 * instead of receiving it and being bounced a moment later.
 *
 * An admin runs the centre rather than just the software, and reaches every
 * area: checking what a teacher set up, or what a learner actually sees, is
 * part of supporting them. Only the admin area is exclusive.
 */
const LMS_ROLE_GATES: Array<{ prefix: string; allow: string[] }> = [
  { prefix: "/lms/admin", allow: ["ADMIN"] },
  { prefix: "/lms/teacher", allow: ["TEACHER", "ADMIN"] },
  { prefix: "/lms/student", allow: ["STUDENT", "ADMIN"] },
];

/**
 * Read the LMS roles out of the auth-service access token.
 *
 * The signature is deliberately not re-verified. The token travels inside the
 * NextAuth session cookie, which getToken() has already authenticated with
 * NEXTAUTH_SECRET, so a client cannot swap in one of their own making.
 *
 * Returns null when the roles cannot be read at all, which the caller treats
 * as "let the client guard decide" rather than as a denial - lms-service is
 * the control that actually protects the data, and a shape change here should
 * not lock everybody out.
 */
function lmsRolesFromAccessToken(accessToken: unknown): string[] | null {
  if (typeof accessToken !== "string") return null;
  const payload = accessToken.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    const roles = JSON.parse(new TextDecoder().decode(bytes))?.roles;
    return Array.isArray(roles) ? roles.filter((r) => typeof r === "string") : null;
  } catch {
    return null;
  }
}

/** Accepts both "ADMIN" and "ROLE_ADMIN", the way hasLmsRole does client-side. */
function holdsAnyRole(roles: string[], allowed: string[]): boolean {
  return roles.some((held) =>
    allowed.some((want) => held === want || held === `ROLE_${want}`)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass token check and session lookup for public file paths to optimize performance
  if (
    pathname.startsWith("/files/") ||
    pathname.startsWith("/lmsapiv1/files/serve/") ||
    pathname.startsWith("/lmsapiv1/files/download/")
  ) {
    return NextResponse.next();
  }

  // If authorization header is already present, just pass the request through.
  // This avoids Next.js request-cloning bugs for multipart form-data (uploads).
  if (
    (pathname.startsWith("/apiv1/") ||
      pathname.startsWith("/lmsapiv1/") ||
      pathname.startsWith("/uploads/")) &&
    req.headers.has("Authorization")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-bdc.session-token.v2"
      : "bdc.session-token.v2",
  });

  // Preserve a deep LMS link across login, then gate the role-specific areas.
  if (pathname === "/lms" || pathname.startsWith("/lms/")) {
    if (!token || !token.accessToken || (token as any).error === "RefreshAccessTokenError") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const gate = LMS_ROLE_GATES.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
    if (gate) {
      const roles = lmsRolesFromAccessToken(token.accessToken);
      if (roles && !holdsAnyRole(roles, gate.allow)) {
        // Same destination the client guard uses, just reached sooner.
        return NextResponse.redirect(new URL("/lms", req.url));
      }
    }

    return NextResponse.next();
  }

  // We only care about proxy paths
  if (
    pathname.startsWith("/apiv1/") ||
    pathname.startsWith("/lmsapiv1/") ||
    pathname.startsWith("/uploads/")
  ) {
    const requestHeaders = new Headers(req.headers);

    if (token?.accessToken) {
      requestHeaders.set("Authorization", `Bearer ${token.accessToken}`);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  }

  // Check admin-only paths
  const adminPaths = ["/users", "/settings"];

  const isAdminPath = adminPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isAdminPath) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (token.role !== "ROLE_ADMIN") {
      return NextResponse.redirect(new URL("/lms", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/apiv1/:path*",
    "/lmsapiv1/:path*",
    "/uploads/:path*",
    "/files/:path*",
    "/lms/:path*",
    "/users/:path*",
    "/settings/:path*",
  ],
};
