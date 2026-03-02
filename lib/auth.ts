import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authEnabled = process.env.AUTH_ENABLED === "true";

export function getTempAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin"
  };
}

export function isTempAdminCredentialsValid(username: string, password: string) {
  const creds = getTempAdminCredentials();
  return username === creds.username && password === creds.password;
}

export const googleOAuthConfigured =
  authEnabled &&
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: authEnabled
    ? [
        CredentialsProvider({
          id: "credentials",
          name: "Credentials",
          credentials: {
            username: { label: "Username", type: "text" },
            password: { label: "Password", type: "password" }
          },
          async authorize(credentials) {
            const username = String(credentials?.username || "").trim();
            const password = String(credentials?.password || "");
            if (!isTempAdminCredentialsValid(username, password)) {
              return null;
            }

            return {
              id: "temp-admin",
              name: "Admin",
              email: "admin@localhost"
            };
          }
        }),
        ...(googleOAuthConfigured
          ? [
              GoogleProvider({
                clientId: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
              })
            ]
          : [])
      ]
    : [],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    }
  }
};
