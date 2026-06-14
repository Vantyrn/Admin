import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

// Admin session policy (issue #1):
// - Deny-by-default: every page/API except the public ones requires a valid admin session.
// - Logged-in users are redirected away from /admin-login to the dashboard.
// - 30-minute session, ROLLING from inactivity: each authenticated PAGE navigation
//   re-issues the token with a fresh 30-min expiry (API polls don't count as activity).
// - SESSION cookie (no maxAge) ⇒ closing the browser ends the session.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing!");
}
const secretKey = new TextEncoder().encode(JWT_SECRET);
const SESSION_MINUTES = 30;

// Public, no-auth paths.
const PUBLIC_PAGES = new Set(["/", "/admin-login"]);
const PUBLIC_APIS = new Set(["/api/admin/login"]);

async function reissue(payload) {
  const { exp, iat, nbf, ...claims } = payload;
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MINUTES}m`)
    .sign(secretKey);
}

function withRolledCookie(res, token) {
  res.cookies.set({
    name: "admin_token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // No maxAge/expires → session cookie (cleared when the browser closes).
  });
  return res;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isLoginPage = pathname === "/admin-login";
  const isPublic = PUBLIC_PAGES.has(pathname) || PUBLIC_APIS.has(pathname);

  // Resolve the session (valid admin token only).
  const token = request.cookies.get("admin_token")?.value;
  let payload = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, secretKey);
      if (verified.payload.role === "admin") payload = verified.payload;
    } catch {
      payload = null;
    }
  }
  const isAuthed = !!payload;

  // Authenticated user hitting the login page → send to the dashboard.
  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Public paths pass through.
  if (isPublic) return NextResponse.next();

  // Everything else is protected.
  if (!isAuthed) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/admin-login", request.url));
    if (token) res.cookies.delete("admin_token"); // clear an expired/invalid cookie
    return res;
  }

  // Authenticated + protected. Roll the 30-min session on page navigations only.
  if (!isApi) {
    try {
      return withRolledCookie(NextResponse.next(), await reissue(payload));
    } catch {
      /* if re-issue fails, still serve the page */
    }
  }
  return NextResponse.next();
}

export const config = {
  // Run on pages + APIs; skip Next internals, the Sentry tunnel, and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.).*)"],
};
