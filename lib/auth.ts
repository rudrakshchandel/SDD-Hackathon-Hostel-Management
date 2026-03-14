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

            // Support both temp admin and real users for now to avoid lockout
            if (isTempAdminCredentialsValid(username, password)) {
              return {
                id: "temp-admin",
                name: "Temp Admin",
                email: "admin@localhost",
                role: "SUPER_ADMIN"
              };
            }

            const { prisma } = await import("@/lib/prisma");
            const user = await prisma.adminUser.findFirst({
              where: {
                OR: [
                  { username },
                  { email: username }
                ],
                status: "ACTIVE"
              }
            });

            // Note: In a production app, we would use bcrypt.compare(password, user.passwordHash)
            // For this hackathon version, we are comparing the hash directly if it matches the seed
            if (!user || user.passwordHash !== password) {
              return null;
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
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
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};
