import { NextResponse, type NextRequest } from "next/server";

// 로그인 쿠키가 없으면 /login 으로 보낸다 (낙관적 검사). 실제 세션 검증은 각 화면의 getSessionUser()에서 한다.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/health")) return NextResponse.next();
  if (!request.cookies.get("sid")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
