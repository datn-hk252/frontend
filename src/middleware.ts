import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * LMS roles carried by the access token.
 *
 * The signature is not checked here - the frontend has no business holding
 * that secret, and every API call is verified on the Go side anyway. This is
 * for choosing a redirect, so a forged token buys nothing: the screen it opens
 * fetches from an API that will refuse it.
 *
 * Reading the token rather than the NextAuth `role` field is deliberate. That
 * field holds the auth-service role, which is only a default: a user can be
 * given LMS roles directly (bulk import writes them), and then the two
 * disagree. The `roles` claim is what auth-service resolved and what the Go
 * API enforces, so gating on it cannot bounce someone the API would let in.
 */
function lmsRolesFrom(accessToken: unknown): string[] {
  if (typeof accessToken !== "string") return [];
  const payload = accessToken.split(".")[1];
  if (!payload) return [];
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const roles = JSON.parse(json)?.roles;
    return Array.isArray(roles) ? roles.map(String) : [];
  } catch {
    return [];
  }
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

  // Preserve a deep LMS link across login, then check the area is one this
  // role has any business in.
  if (pathname === "/lms" || pathname.startsWith("/lms/")) {
    if (!token || !token.accessToken || (token as any).error === "RefreshAccessTokenError") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    // Defence in depth, not the defence itself: the Go API gates every read
    // and write with RequireRoles, so a student who reached /lms/admin before
    // this got a rendered shell full of failed requests rather than data.
    // Bouncing them here sends them somewhere they can actually use, and
    // stops the admin screens being a URL anyone can type.
    //
    // Empty roles means the token predates this claim or could not be read,
    // and it fails open - the API still refuses what it should.
    const roles = lmsRolesFrom(token.accessToken);
    if (roles.length > 0) {
      const denied =
        (pathname.startsWith("/lms/admin") && !roles.includes("ADMIN")) ||
        (pathname.startsWith("/lms/teacher") &&
          !roles.includes("TEACHER") &&
          !roles.includes("ADMIN"));
      if (denied) {
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
