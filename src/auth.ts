import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { getServerEnv } from "@/lib/env/server";
import { getPrisma } from "@/server/db/prisma";

const env = getServerEnv();

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(getPrisma()),
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [],
});
