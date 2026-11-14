import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  createLocalOwner,
  localOwnerExists,
  resetLocalOwnerPassword,
} from "../../src/server/auth/local-owner";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("local owner (LF-06)", () => {
  it("creates the owner once and refuses a second account", async () => {
    expect(await localOwnerExists(prisma)).toBe(false);
    const owner = await createLocalOwner(prisma, {
      email: "owner@test.invalid",
      name: "Owner",
      passwordHash: "hash",
    });
    expect(owner?.email).toBe("owner@test.invalid");
    expect(await localOwnerExists(prisma)).toBe(true);
    expect(
      await createLocalOwner(prisma, {
        email: "second@test.invalid",
        name: "Second",
        passwordHash: "hash",
      }),
    ).toBeNull();
    expect(await prisma.user.count()).toBe(1);
  });

  it("lets exactly one of several concurrent first-run submissions win", async () => {
    // Separate clients (separate connection pools), as separate processes
    // would be; a single client serializes its interactive transactions.
    const clients = Array.from(
      { length: 8 },
      () =>
        new PrismaClient({
          adapter: new PrismaPg({ connectionString: databaseUrl }),
        }),
    );
    try {
      await Promise.all(clients.map((client) => client.$connect()));
      const results = await Promise.all(
        clients.map((client, index) =>
          createLocalOwner(client, {
            email: `racer-${index}@test.invalid`,
            name: `Racer ${index}`,
            passwordHash: "hash",
          }),
        ),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await prisma.user.count()).toBe(1);
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });

  it("resets the owner's password and ends every session", async () => {
    expect(await resetLocalOwnerPassword(prisma, "new-hash")).toBe(false);
    const owner = await createLocalOwner(prisma, {
      email: "owner@test.invalid",
      name: "Owner",
      passwordHash: "old-hash",
    });
    await prisma.session.create({
      data: {
        sessionToken: "local-session-token",
        userId: owner!.id,
        expires: new Date(Date.now() + 60_000),
      },
    });
    expect(await resetLocalOwnerPassword(prisma, "new-hash")).toBe(true);
    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: owner!.id },
    });
    expect(updated.passwordHash).toBe("new-hash");
    expect(await prisma.session.count({ where: { userId: owner!.id } })).toBe(
      0,
    );
  });
});
