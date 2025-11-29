import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app very slow.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in, handle role-based routing
  if (user) {
    // Fetch user role once
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = userData?.role;

    // If no role found (user record doesn't exist yet), allow access to current page
    // This prevents redirect loops during the brief moment after signup
    if (!role) {
      // If on auth pages, just let them through (they'll be redirected after page loads)
      if (pathname === "/login" || pathname === "/register") {
        return supabaseResponse;
      }
      // For other routes, allow access - the page will handle missing data gracefully
      return supabaseResponse;
    }

    // Redirect away from auth pages to appropriate dashboard
    if (pathname === "/login" || pathname === "/register") {
      const url = request.nextUrl.clone();
      url.pathname = role === "therapist" ? "/dashboard" : "/my-plan";
      return NextResponse.redirect(url);
    }

    // Role-based route protection
    const isTherapistRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/clients");
    const isClientRoute = pathname.startsWith("/my-plan") || pathname.startsWith("/my-sessions");

    if (isTherapistRoute && role !== "therapist") {
      const url = request.nextUrl.clone();
      url.pathname = "/my-plan";
      return NextResponse.redirect(url);
    }

    if (isClientRoute && role !== "client") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
