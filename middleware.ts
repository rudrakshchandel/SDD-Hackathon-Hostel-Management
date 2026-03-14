import { withAuth } from "next-auth/middleware";
import { authEnabled } from "@/lib/auth";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (!authEnabled) return true;
      if (!token) return false;

      // Restrict /back-office and /api/admin to SUPER_ADMIN
      if (req.nextUrl.pathname.startsWith("/back-office") || req.nextUrl.pathname.startsWith("/api/admin")) {
        return token.role === "SUPER_ADMIN";
      }

      return true;
    }
  },
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/rooms/:path*",
    "/hostel/:path*",
    "/tenants/:path*",
    "/revenue/:path*",
    "/back-office/:path*",
    "/api/admin/:path*"
  ]
};
