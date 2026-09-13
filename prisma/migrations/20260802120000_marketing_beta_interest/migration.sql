CREATE TABLE "BetaInterest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyOrProject" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "primaryChallenge" TEXT NOT NULL,
    "currentTools" TEXT,
    "expectedMonthlyUsage" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetaInterest_email_key" ON "BetaInterest"("email");
CREATE INDEX "BetaInterest_createdAt_idx" ON "BetaInterest"("createdAt" DESC);
