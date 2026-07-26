import "server-only";

import type { PrismaClient, User } from "@/generated/prisma/client";

export type AccountIdentity = Pick<User, "id" | "name" | "email">;

export function createUserRepository(prisma: PrismaClient) {
  return {
    findByEmail(email: string): Promise<User | null> {
      return prisma.user.findUnique({ where: { email } });
    },

    findIdentityById(id: string): Promise<AccountIdentity | null> {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true },
      });
    },

    createWithPassword(input: {
      email: string;
      name: string;
      passwordHash: string;
    }): Promise<AccountIdentity> {
      return prisma.user.create({
        data: input,
        select: { id: true, name: true, email: true },
      });
    },
  };
}
