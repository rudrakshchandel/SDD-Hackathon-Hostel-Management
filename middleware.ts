import { withAuth } from "next-auth/middleware";
import { authEnabled } from "@/lib/auth";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      if (!authEnabled) return true;
      return Boolean(token);
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
    "/revenue/:path*"
  ]
};
