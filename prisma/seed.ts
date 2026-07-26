import "dotenv/config";

import { hash } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { BrandProfileSchema } from "../src/domain/brand-profile/brand-profile-schema";
import { CalendarSnapshotSchema } from "../src/domain/calendar/calendar-schemas";
import { CopyGenerationRequestSchema } from "../src/domain/copy/copy-schemas";
import {
  createDeterministicCopySnapshot,
  type CopyItemRequest,
} from "../src/workers/handlers/copy-handler";

const DEMO_PASSWORD = "UrbanStride-demo-2026!";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Synthetic development seed is disabled in production.");
  }
  if (process.env.SEED_DEMO_DATA !== "true") {
    throw new Error("Set SEED_DEMO_DATA=true to run the synthetic seed.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  const passwordOptions: Options = {
    algorithm: 2,
    version: 1,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  };
  const passwordHash = await hash(DEMO_PASSWORD, passwordOptions);

  try {
    const demo = await prisma.user.upsert({
      where: { email: "demo@webcontentflow.local" },
      update: { name: "Demo User", passwordHash },
      create: {
        id: "phase1-demo-user",
        email: "demo@webcontentflow.local",
        name: "Demo User",
        passwordHash,
      },
    });

    const urbanStride = await prisma.project.upsert({
      where: { id: "phase1-urbanstride-project" },
      update: {
        userId: demo.id,
        name: "UrbanStride",
        brandName: "UrbanStride",
        type: "E-commerce",
        status: "ACTIVE",
      },
      create: {
        id: "phase1-urbanstride-project",
        userId: demo.id,
        name: "UrbanStride",
        brandName: "UrbanStride",
        type: "E-commerce",
        status: "ACTIVE",
        outputLanguage: "English",
      },
    });
    await prisma.projectBrief.upsert({
      where: { projectId: urbanStride.id },
      update: {},
      create: {
        projectId: urbanStride.id,
        schemaVersion: "1.0",
        revision: 1,
        data: {
          schemaVersion: "1.0",
          project: {
            projectName: "UrbanStride",
            brandName: "UrbanStride",
            projectType: "E-commerce",
            businessDescription:
              "Fictional urban footwear business used for development.",
            productOrService: "Comfortable walking shoes for daily city use.",
          },
          audience: {
            targetAudience: "Urban professionals who walk or commute daily",
            interests: ["walking", "design"],
            customerProblem:
              "Daily footwear is uncomfortable or visually generic.",
            valueProposition:
              "Comfort and considered design for every city journey.",
          },
          objective: {
            primaryObjective: "Launch a fictional first collection",
            desiredCustomerAction: "Explore the collection",
            primaryOffer: "Versatile city shoes with all-day comfort",
          },
          direction: {
            toneOfVoice: "Clear, confident, practical",
            preferredColors: ["navy", "blue"],
            colorsToAvoid: ["neon"],
            keywords: ["movement", "comfort"],
            competitors: [],
            referenceWebsites: [],
          },
          languageModules: {
            outputLanguage: "English",
            selectedModules: ["WEBSITE", "SOCIAL"],
          },
        },
      },
    });

    const brandProfile = await prisma.brandProfile.upsert({
      where: { projectId: urbanStride.id },
      update: {},
      create: { id: "phase3-urbanstride-profile", projectId: urbanStride.id },
    });
    const brandSnapshot = {
      schemaVersion: "1.0",
      brandSummary:
        "UrbanStride is a fictional urban footwear brand for daily commuters.",
      positioning:
        "Practical, considered footwear for people moving through the city.",
      valueProposition: "Comfort and considered design for every city journey.",
      mission: "Make everyday city movement more comfortable.",
      vision: "Set a practical standard for fictional urban footwear.",
      values: ["Clarity", "Comfort", "Considered design"],
      targetAudienceSummary: "Urban professionals who walk or commute daily.",
      customerProblem: "Daily footwear is uncomfortable or visually generic.",
      brandPromise: "Comfortable movement without compromising design.",
      slogan: "Move through the city in comfort",
      personality: ["Confident", "Practical", "Modern"],
      toneOfVoice: ["Clear", "Confident", "Practical"],
      writingGuidelines: [
        "Lead with practical outcomes.",
        "Use direct language.",
      ],
      wordsToUse: ["movement", "comfort", "considered"],
      wordsToAvoid: ["magic", "revolutionary"],
      visualDirection: "Editorial urban photography and structured layouts.",
      colorPalette: [
        { name: "Navy", hex: "#0F172A", role: "Primary text" },
        { name: "Blue", hex: "#3B82F6", role: "Accent" },
      ],
      typographyRecommendations: [
        "Geometric sans-serif headings",
        "Readable sans-serif body",
      ],
      imageDirection: "Realistic city movement with natural detail.",
      reusableImagePrompt:
        "Create a realistic editorial image of an urban commuter walking through a modern city. No text or logos.",
      keyMarketingMessages: [
        "Comfort for every city journey.",
        "Designed for daily movement.",
      ],
      primaryCallsToAction: ["Explore the collection", "Learn more"],
      provenance: {
        provider: "mock",
        model: "mock-brand-profile-v1",
        promptVersion: "brand-profile-1.0",
        schemaVersion: "1.0",
        requestId: "phase3-seed-profile-request",
        generationJobId: null,
        generatedAt: "2026-01-01T00:00:00.000Z",
        mock: true,
        briefRevision: 1,
      },
    };
    const profileVersion =
      (await prisma.brandProfileVersion.findUnique({
        where: {
          brandProfileId_versionNumber: {
            brandProfileId: brandProfile.id,
            versionNumber: 1,
          },
        },
      })) ??
      (await prisma.brandProfileVersion.create({
        data: {
          id: "phase3-urbanstride-profile-v1",
          brandProfileId: brandProfile.id,
          versionNumber: 1,
          schemaVersion: "1.0",
          snapshot: brandSnapshot,
          source: "GENERATED",
          mock: true,
          provenance: brandSnapshot.provenance,
        },
      }));
    await prisma.project.update({
      where: { id: urbanStride.id },
      data: { currentBrandProfileVersionId: profileVersion.id },
    });

    let contentItem = await prisma.contentItem.findUnique({
      where: { id: "phase3-urbanstride-foundation-copy" },
    });
    if (!contentItem) {
      contentItem = await prisma.contentItem.create({
        data: {
          id: "phase3-urbanstride-foundation-copy",
          projectId: urbanStride.id,
          module: "COPY",
          type: "FOUNDATION_COPY",
          title: "UrbanStride foundation copy",
          status: "DRAFT",
          sourceBrandProfileVersionId: profileVersion.id,
        },
      });
    }
    const contentProvenance = {
      provider: "mock",
      model: "mock-foundation-copy-v1",
      promptVersion: "foundation-copy-1.0",
      schemaVersion: "1.0",
      requestId: "phase3-seed-content-request",
      generationJobId: null,
      brandProfileVersionId: profileVersion.id,
      generatedAt: "2026-01-01T00:00:00.000Z",
      mock: true,
    };
    const snapshots = [
      {
        schemaVersion: "1.0",
        title: "UrbanStride foundation copy",
        objective: "Introduce the fictional UrbanStride launch.",
        headline: "Move through the city in comfort",
        body: "UrbanStride pairs everyday comfort with considered urban design.",
        callToAction: "Explore the collection",
      },
      {
        schemaVersion: "1.0",
        title: "UrbanStride foundation copy",
        objective: "Introduce the fictional UrbanStride launch clearly.",
        headline: "Comfort designed for city movement",
        body: "UrbanStride creates versatile footwear for people who walk and commute every day.",
        callToAction: "Explore UrbanStride",
        notes: "Synthetic Phase 3 proof content.",
      },
    ];
    let currentContentVersionId = contentItem.currentVersionId;
    for (const [index, snapshot] of snapshots.entries()) {
      const versionNumber = index + 1;
      const version =
        (await prisma.contentItemVersion.findUnique({
          where: {
            contentItemId_versionNumber: {
              contentItemId: contentItem.id,
              versionNumber,
            },
          },
        })) ??
        (await prisma.contentItemVersion.create({
          data: {
            id: `phase3-urbanstride-content-v${versionNumber}`,
            contentItemId: contentItem.id,
            versionNumber,
            schemaVersion: "1.0",
            snapshot,
            source: versionNumber === 1 ? "GENERATED" : "MANUAL_EDIT",
            brandProfileVersionId: profileVersion.id,
            actorUserId: versionNumber === 2 ? demo.id : null,
            mock: true,
            provenance: contentProvenance,
          },
        }));
      currentContentVersionId = version.id;
    }
    await prisma.contentItem.update({
      where: { id: contentItem.id },
      data: { currentVersionId: currentContentVersionId },
    });
    await prisma.contentItemVersion.deleteMany({
      where: { contentItemId: contentItem.id, versionNumber: { gt: 2 } },
    });
    await prisma.generationJob.deleteMany({
      where: {
        projectId: urbanStride.id,
        module: "COPY",
        scopeType: "CONTENT_ITEM",
      },
    });

    const websiteSettings = {
      schemaVersion: "1.0",
      websiteObjective:
        "Introduce UrbanStride and its fictional city footwear.",
      websiteType: "ECOMMERCE",
      selectedPages: ["HOME", "ABOUT", "SERVICES"],
      additionalPages: [],
      primaryConversionAction: "Explore the collection",
      seoFocus: "comfortable urban footwear",
      mockScenario: "success",
    };
    await prisma.projectModule.upsert({
      where: {
        projectId_module: {
          projectId: urbanStride.id,
          module: "WEBSITE",
        },
      },
      update: { settings: websiteSettings, status: "COMPLETE" },
      create: {
        projectId: urbanStride.id,
        module: "WEBSITE",
        status: "COMPLETE",
        settings: websiteSettings,
      },
    });
    const websiteProvenance = {
      provider: "mock",
      model: "mock-website-v1",
      promptVersion: "website-page-1.0",
      schemaVersion: "1.0",
      requestId: "phase4-seed-website-request",
      generationJobId: null,
      brandProfileVersionId: profileVersion.id,
      generatedAt: "2026-01-01T00:00:00.000Z",
      mock: true,
    };
    for (const page of [
      { key: "home", type: "HOME", name: "Home" },
      { key: "about", type: "ABOUT", name: "About" },
      { key: "services", type: "SERVICES", name: "Services" },
    ]) {
      const websiteItem =
        (await prisma.contentItem.findUnique({
          where: {
            projectId_module_identityKey: {
              projectId: urbanStride.id,
              module: "WEBSITE",
              identityKey: page.key,
            },
          },
        })) ??
        (await prisma.contentItem.create({
          data: {
            id: `phase4-urbanstride-${page.key}`,
            projectId: urbanStride.id,
            module: "WEBSITE",
            type: "WEBSITE_PAGE",
            identityKey: page.key,
            title: page.name,
            status: "DRAFT",
            sourceBrandProfileVersionId: profileVersion.id,
          },
        }));
      const versionCount = page.key === "home" ? 2 : 1;
      let currentWebsiteVersion = websiteItem.currentVersionId;
      for (
        let versionNumber = 1;
        versionNumber <= versionCount;
        versionNumber++
      ) {
        const snapshot = {
          schemaVersion: "1.0",
          pageKey: page.key,
          pageType: page.type,
          pageName: page.name,
          purpose: `Help visitors understand the fictional UrbanStride ${page.name} page.`,
          targetAudience: brandSnapshot.targetAudienceSummary,
          seo: {
            title: `${page.name} | UrbanStride city footwear`,
            metaDescription:
              "Discover fictional UrbanStride footwear designed for comfortable daily movement through the city.",
            primaryKeyword: "urban footwear",
            secondaryKeywords: ["city shoes", "daily comfort"],
          },
          hero: {
            eyebrow: "UrbanStride",
            headline:
              versionNumber === 1
                ? "Move through the city in comfort"
                : "Comfort designed for city movement",
            supportingText: brandSnapshot.valueProposition,
            primaryCTA: "Explore the collection",
          },
          sections: [
            {
              id: `${page.key}-intro`,
              type: "INTRO",
              heading: `UrbanStride ${page.name}`,
              body: brandSnapshot.brandSummary,
            },
            {
              id: `${page.key}-benefits`,
              type: "BENEFITS",
              heading: "Designed for daily movement",
              items: [
                {
                  title: "Everyday comfort",
                  description: "Support for long walks and daily commutes.",
                },
                {
                  title: "Considered design",
                  description: "A versatile look for the modern city.",
                },
              ],
            },
          ],
          finalCTA: {
            heading: "Start your next city journey",
            body: brandSnapshot.brandPromise,
            callToAction: "Explore the collection",
          },
          provenance: websiteProvenance,
        };
        const version =
          (await prisma.contentItemVersion.findUnique({
            where: {
              contentItemId_versionNumber: {
                contentItemId: websiteItem.id,
                versionNumber,
              },
            },
          })) ??
          (await prisma.contentItemVersion.create({
            data: {
              id: `phase4-urbanstride-${page.key}-v${versionNumber}`,
              contentItemId: websiteItem.id,
              versionNumber,
              schemaVersion: "1.0",
              snapshot,
              source: versionNumber === 1 ? "GENERATED" : "MANUAL_EDIT",
              brandProfileVersionId: profileVersion.id,
              actorUserId: versionNumber === 2 ? demo.id : null,
              mock: true,
              provenance: websiteProvenance,
            },
          }));
        currentWebsiteVersion = version.id;
      }
      await prisma.contentItem.update({
        where: { id: websiteItem.id },
        data: { currentVersionId: currentWebsiteVersion },
      });
    }

    const socialSettings = {
      schemaVersion: "1.0",
      campaignName: "UrbanStride City Launch",
      campaignDescription:
        "Synthetic campaign used to validate the Social content platform.",
      platforms: ["INSTAGRAM", "LINKEDIN"],
      objectives: ["AWARENESS", "EDUCATION"],
      contentTypes: [
        "SOCIAL_POST",
        "SOCIAL_CAROUSEL",
        "SOCIAL_STORY",
        "SOCIAL_CAPTION",
      ],
      quantity: 5,
      primaryCallToAction: "Explore the collection",
      toneOverride: "INHERIT",
      topic: "Comfortable movement through the city",
      outputLanguage: "English",
      includeHashtags: true,
      mockScenario: "success",
    };
    await prisma.projectModule.upsert({
      where: {
        projectId_module: {
          projectId: urbanStride.id,
          module: "SOCIAL",
        },
      },
      update: { settings: socialSettings, status: "COMPLETE" },
      create: {
        projectId: urbanStride.id,
        module: "SOCIAL",
        status: "COMPLETE",
        settings: socialSettings,
      },
    });
    const socialProvenance = {
      provider: "mock",
      model: "mock-social-v1",
      promptVersion: "social-content-1.0",
      schemaVersion: "1.0",
      requestId: "phase4-2-seed-social-request",
      generationJobId: null,
      brandProfileVersionId: profileVersion.id,
      generatedAt: "2026-01-01T00:00:00.000Z",
      mock: true,
    };
    const socialSnapshots = [
      {
        key: "seed-instagram-post",
        type: "SOCIAL_POST",
        versions: [
          {
            schemaVersion: "1.0",
            contentType: "SOCIAL_POST",
            platform: "INSTAGRAM",
            objective: "AWARENESS",
            title: "Instagram city movement post",
            hook: "Move through the city in comfort",
            body: "UrbanStride pairs everyday comfort with considered design.",
            callToAction: "Explore the collection",
            hashtags: ["UrbanStride", "CityMovement"],
            campaignName: "UrbanStride City Launch",
            provenance: socialProvenance,
          },
          {
            schemaVersion: "1.0",
            contentType: "SOCIAL_POST",
            platform: "INSTAGRAM",
            objective: "AWARENESS",
            title: "Instagram city movement post",
            hook: "Comfort designed for city movement",
            body: "Meet footwear created for daily walks and commutes.",
            callToAction: "Explore UrbanStride",
            hashtags: ["UrbanStride", "EverydayComfort"],
            campaignName: "UrbanStride City Launch",
            notes: "Synthetic edited Social version.",
            provenance: socialProvenance,
          },
        ],
      },
      {
        key: "seed-linkedin-post",
        type: "SOCIAL_POST",
        versions: [
          {
            schemaVersion: "1.0",
            contentType: "SOCIAL_POST",
            platform: "LINKEDIN",
            objective: "EDUCATION",
            title: "LinkedIn product design post",
            hook: "Why daily movement deserves considered footwear",
            body: "UrbanStride focuses on practical comfort for urban professionals.",
            callToAction: "Learn more",
            hashtags: ["UrbanDesign", "DailyMovement"],
            campaignName: "UrbanStride City Launch",
            provenance: socialProvenance,
          },
        ],
      },
      {
        key: "seed-instagram-carousel",
        type: "SOCIAL_CAROUSEL",
        versions: [
          {
            schemaVersion: "1.0",
            contentType: "SOCIAL_CAROUSEL",
            platform: "INSTAGRAM",
            objective: "EDUCATION",
            title: "Three principles for comfortable city movement",
            slides: [1, 2, 3].map((ordinal) => ({
              id: `seed-slide-${ordinal}`,
              ordinal,
              headline: `Principle ${ordinal}`,
              body: "Consider comfort, versatility and everyday movement.",
            })),
            caption: "A practical guide to footwear for the modern city.",
            closingCallToAction: "Explore the collection",
            hashtags: ["UrbanStride", "CityGuide"],
            campaignName: "UrbanStride City Launch",
            provenance: socialProvenance,
          },
        ],
      },
      {
        key: "seed-instagram-story",
        type: "SOCIAL_STORY",
        versions: [
          {
            schemaVersion: "1.0",
            contentType: "SOCIAL_STORY",
            platform: "INSTAGRAM",
            objective: "LAUNCH",
            title: "UrbanStride launch story",
            frames: [1, 2, 3].map((ordinal) => ({
              id: `seed-frame-${ordinal}`,
              ordinal,
              headline: ordinal === 1 ? "Meet UrbanStride" : `Step ${ordinal}`,
              body: "Comfort and considered design for every city journey.",
              ...(ordinal === 3
                ? { callToAction: "Explore the collection" }
                : {}),
            })),
            finalCallToAction: "Explore the collection",
            campaignName: "UrbanStride City Launch",
            provenance: socialProvenance,
          },
        ],
      },
      {
        key: "seed-instagram-caption",
        type: "SOCIAL_CAPTION",
        versions: [
          {
            schemaVersion: "1.0",
            contentType: "SOCIAL_CAPTION",
            platform: "INSTAGRAM",
            objective: "PROMOTION",
            title: "UrbanStride collection caption",
            caption:
              "Move through the city with comfort designed for daily life.",
            callToAction: "Explore the collection",
            hashtags: ["UrbanStride", "CityMovement"],
            campaignName: "UrbanStride City Launch",
            provenance: socialProvenance,
          },
        ],
      },
    ];
    for (const seeded of socialSnapshots) {
      const socialItem =
        (await prisma.contentItem.findUnique({
          where: {
            projectId_module_identityKey: {
              projectId: urbanStride.id,
              module: "SOCIAL",
              identityKey: seeded.key,
            },
          },
        })) ??
        (await prisma.contentItem.create({
          data: {
            id: `phase4-2-${seeded.key}`,
            projectId: urbanStride.id,
            module: "SOCIAL",
            type: seeded.type,
            identityKey: seeded.key,
            title: seeded.versions[0]!.title,
            status: "DRAFT",
            sourceBrandProfileVersionId: profileVersion.id,
          },
        }));
      let currentSocialVersion = socialItem.currentVersionId;
      for (const [index, snapshot] of seeded.versions.entries()) {
        const versionNumber = index + 1;
        const version =
          (await prisma.contentItemVersion.findUnique({
            where: {
              contentItemId_versionNumber: {
                contentItemId: socialItem.id,
                versionNumber,
              },
            },
          })) ??
          (await prisma.contentItemVersion.create({
            data: {
              id: `phase4-2-${seeded.key}-v${versionNumber}`,
              contentItemId: socialItem.id,
              versionNumber,
              schemaVersion: "1.0",
              snapshot,
              source: versionNumber === 1 ? "GENERATED" : "MANUAL_EDIT",
              brandProfileVersionId: profileVersion.id,
              actorUserId: versionNumber === 2 ? demo.id : null,
              mock: true,
              provenance: socialProvenance,
            },
          }));
        currentSocialVersion = version.id;
      }
      await prisma.contentItem.update({
        where: { id: socialItem.id },
        data: {
          currentVersionId: currentSocialVersion,
          title: seeded.versions.at(-1)!.title,
        },
      });
      await prisma.contentItemVersion.deleteMany({
        where: {
          contentItemId: socialItem.id,
          versionNumber: { gt: seeded.versions.length },
        },
      });
    }
    await prisma.generationJob.deleteMany({
      where: { projectId: urbanStride.id, module: "SOCIAL" },
    });

    const adsSettings = {
      schemaVersion: "1.0",
      campaignName: "UrbanStride City Launch",
      campaignObjective: "CONVERSIONS",
      channels: ["GOOGLE_SEARCH", "META_INSTAGRAM", "LINKEDIN"],
      assetTypes: [
        "GOOGLE_SEARCH_AD",
        "META_AD",
        "LINKEDIN_AD",
        "CREATIVE_BRIEF",
        "IMAGE_PROMPT_PACK",
      ],
      offer: {
        name: "UrbanStride launch collection",
        description: "Fictional footwear designed for everyday city movement.",
        differentiators: ["Everyday comfort", "Restrained urban design"],
        proofPoints: ["Synthetic product brief only"],
      },
      audience: {
        summary: "Urban professionals who walk and commute regularly.",
        painPoints: ["Uncomfortable daily footwear"],
        desiredOutcomes: ["Comfortable movement throughout the day"],
        objections: ["Concern about style versatility"],
      },
      primaryConversionAction: "Explore the collection",
      keywordThemes: ["urban footwear", "comfortable city shoes"],
      variantsPerAsset: 2,
      outputLanguage: "English",
      mockScenario: "success",
    };
    await prisma.projectModule.upsert({
      where: {
        projectId_module: { projectId: urbanStride.id, module: "ADS" },
      },
      update: { settings: adsSettings, status: "COMPLETE" },
      create: {
        projectId: urbanStride.id,
        module: "ADS",
        status: "COMPLETE",
        settings: adsSettings,
      },
    });
    const adsProvenance = {
      provider: "mock",
      model: "mock-ads-v1",
      promptVersion: "ads-creative-1.0",
      schemaVersion: "1.0",
      requestId: "phase4-3-seed-ads-request",
      generationJobId: null,
      brandProfileVersionId: profileVersion.id,
      generatedAt: "2026-01-01T00:00:00.000Z",
      mock: true,
    };
    const adsCommon = {
      schemaVersion: "1.0",
      campaignObjective: "CONVERSIONS",
      campaignName: "UrbanStride City Launch",
      campaignNotes: "Synthetic Phase 4.3 advertising content.",
      complianceNotes: [
        "Review claims, disclosures and platform requirements before publishing.",
      ],
      provenance: adsProvenance,
    };
    const adsSnapshots = [
      {
        key: "seed-google-search-ad",
        type: "GOOGLE_SEARCH_AD",
        snapshot: {
          ...adsCommon,
          contentType: "GOOGLE_SEARCH_AD",
          channel: "GOOGLE_SEARCH",
          title: "UrbanStride Google Search ad",
          variants: ["A", "B"].map((label, index) => ({
            id: `variant-${index + 1}`,
            label: `Variant ${label}`,
            headlines: [
              "Comfort for city movement",
              "Explore UrbanStride footwear",
              `Everyday comfort concept ${index + 1}`,
            ],
            descriptions: [
              "Fictional footwear designed for daily city movement.",
              "Explore the synthetic UrbanStride launch collection.",
            ],
            pathOne: "city",
            pathTwo: "comfort",
            callToAction: "Explore the collection",
            keywordThemes: ["urban footwear", "comfortable city shoes"],
          })),
        },
      },
      {
        key: "seed-meta-instagram-ad",
        type: "META_AD",
        snapshot: {
          ...adsCommon,
          contentType: "META_AD",
          channel: "META_INSTAGRAM",
          title: "UrbanStride Instagram ad",
          variants: ["A", "B"].map((label, index) => ({
            id: `variant-${index + 1}`,
            label: `Variant ${label}`,
            primaryText:
              "Move through the city with fictional UrbanStride comfort.",
            headline: "Designed for everyday movement",
            description: "A synthetic advertising draft.",
            callToAction: "Explore the collection",
            creativeAngle: index
              ? "Confident daily movement"
              : "Everyday city comfort",
            visualDirection: "Realistic urban product photography.",
          })),
        },
      },
      {
        key: "seed-linkedin-ad",
        type: "LINKEDIN_AD",
        snapshot: {
          ...adsCommon,
          contentType: "LINKEDIN_AD",
          channel: "LINKEDIN",
          title: "UrbanStride LinkedIn ad",
          variants: ["A", "B"].map((label, index) => ({
            id: `variant-${index + 1}`,
            label: `Variant ${label}`,
            introductoryText:
              "A fictional launch concept for urban professionals.",
            headline: "Comfort for the modern working day",
            description: "Synthetic draft content.",
            callToAction: "Learn more",
            professionalAngle: index
              ? "Reliable everyday utility"
              : "Considered urban design",
          })),
        },
      },
      {
        key: "seed-creative-brief",
        type: "CREATIVE_BRIEF",
        snapshot: {
          ...adsCommon,
          contentType: "CREATIVE_BRIEF",
          channel: "META_INSTAGRAM",
          title: "UrbanStride creative brief",
          audienceInsight: "Urban professionals value comfort and versatility.",
          campaignPromise: "Comfort designed for daily city movement.",
          keyMessage: "Move through the city with confidence.",
          supportPoints: ["Everyday comfort", "Restrained design"],
          visualDirection: {
            concept: "Natural city movement with the product in use.",
            exclusions: ["Fabricated awards", "Performance metrics"],
          },
          copyDirection: {
            tone: "Clear, confident and practical.",
            mandatoryMessages: ["Everyday city comfort"],
            avoidMessages: ["Guaranteed results"],
          },
          deliverables: ["Advertising copy direction", "Visual direction"],
        },
      },
      {
        key: "seed-image-prompt-pack",
        type: "IMAGE_PROMPT_PACK",
        snapshot: {
          ...adsCommon,
          contentType: "IMAGE_PROMPT_PACK",
          channel: "META_INSTAGRAM",
          title: "UrbanStride image prompt pack",
          prompts: [1, 2].map((ordinal) => ({
            id: `prompt-${ordinal}`,
            label: `Prompt ${ordinal}`,
            purpose: "Fictional UrbanStride advertising concept.",
            prompt:
              "Realistic urban footwear photography with natural daylight and restrained composition.",
            aspectRatio: "4:5",
            composition: "Single focal product moment.",
            lighting: "Natural daylight",
            styleDirection: "Premium and practical",
            negativeInstructions: ["No third-party logos", "No fake awards"],
            overlayCopyGuidance: "Reserve clear space for separate copy.",
          })),
          notes: "Prompt pack only — no image was generated.",
        },
      },
    ];
    for (const seeded of adsSnapshots) {
      const item =
        (await prisma.contentItem.findUnique({
          where: {
            projectId_module_identityKey: {
              projectId: urbanStride.id,
              module: "ADS",
              identityKey: seeded.key,
            },
          },
        })) ??
        (await prisma.contentItem.create({
          data: {
            id: `phase4-3-${seeded.key}`,
            projectId: urbanStride.id,
            module: "ADS",
            type: seeded.type,
            identityKey: seeded.key,
            title: seeded.snapshot.title,
            status: "DRAFT",
            sourceBrandProfileVersionId: profileVersion.id,
          },
        }));
      const version =
        (await prisma.contentItemVersion.findUnique({
          where: {
            contentItemId_versionNumber: {
              contentItemId: item.id,
              versionNumber: 1,
            },
          },
        })) ??
        (await prisma.contentItemVersion.create({
          data: {
            id: `phase4-3-${seeded.key}-v1`,
            contentItemId: item.id,
            versionNumber: 1,
            schemaVersion: "1.0",
            snapshot: seeded.snapshot,
            source: "GENERATED",
            brandProfileVersionId: profileVersion.id,
            mock: true,
            provenance: adsProvenance,
          },
        }));
      let currentAdsVersionId = version.id;
      if (seeded.type === "META_AD") {
        const editedSnapshot = {
          ...seeded.snapshot,
          campaignNotes:
            "Synthetic Phase 4.3 manually edited advertising content.",
        };
        const editedVersion =
          (await prisma.contentItemVersion.findUnique({
            where: {
              contentItemId_versionNumber: {
                contentItemId: item.id,
                versionNumber: 2,
              },
            },
          })) ??
          (await prisma.contentItemVersion.create({
            data: {
              id: `phase4-3-${seeded.key}-v2`,
              contentItemId: item.id,
              versionNumber: 2,
              schemaVersion: "1.0",
              snapshot: editedSnapshot,
              source: "MANUAL_EDIT",
              brandProfileVersionId: profileVersion.id,
              actorUserId: demo.id,
              mock: true,
              provenance: adsProvenance,
            },
          }));
        currentAdsVersionId = editedVersion.id;
      }
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { currentVersionId: currentAdsVersionId },
      });
      await prisma.contentItemVersion.deleteMany({
        where: {
          contentItemId: item.id,
          versionNumber: { gt: seeded.type === "META_AD" ? 2 : 1 },
        },
      });
    }
    await prisma.generationJob.deleteMany({
      where: { projectId: urbanStride.id, module: "ADS" },
    });

    const videoProvenance = {
      provider: "mock",
      model: "mock-video-v1",
      promptVersion: "video-planning-1.0",
      schemaVersion: "1.0",
      requestId: "phase4-4-seed-video-request",
      generationJobId: null,
      brandProfileVersionId: profileVersion.id,
      generatedAt: "2026-01-01T00:00:00.000Z",
      mock: true,
    };
    const videoBase = {
      schemaVersion: "1.0",
      platform: "INSTAGRAM_REELS",
      format: "REEL",
      objective: "AWARENESS",
      campaignName: "UrbanStride city movement",
      provenance: videoProvenance,
    };
    const videoSnapshots = [
      {
        key: "seed-video-script",
        type: "VIDEO_SCRIPT",
        snapshot: {
          ...videoBase,
          contentType: "VIDEO_SCRIPT",
          title: "UrbanStride 30-second Reel script",
          conceptSummary:
            "Follow a commuter from the first city step to a comfortable arrival.",
          targetDurationSeconds: 30,
          hook: {
            spokenText: "Your city day starts with the first step.",
            onScreenText: "Comfort for every city journey",
            visualDirection: "Tight detail of a shoe meeting the pavement.",
          },
          scenes: [
            {
              id: "scene-1",
              ordinal: 1,
              estimatedDurationSeconds: 10,
              purpose: "Establish the daily movement problem.",
              visualDirection: "Morning commuter moving through a station.",
              spokenText: "The city rarely slows down.",
              onScreenText: "Built for daily movement",
              transition: "Direct cut on the next step.",
            },
            {
              id: "scene-2",
              ordinal: 2,
              estimatedDurationSeconds: 10,
              purpose: "Show product comfort in context.",
              visualDirection: "Natural walking details across city surfaces.",
              voiceOver: "UrbanStride combines comfort with considered design.",
              onScreenText: "Comfort meets considered design",
              transition: "Match cut between surfaces.",
            },
            {
              id: "scene-3",
              ordinal: 3,
              estimatedDurationSeconds: 10,
              purpose: "Resolve with a clear next action.",
              visualDirection:
                "Commuter arrives relaxed at a city destination.",
              spokenText: "Move through the city in comfort.",
              onScreenText: "Explore UrbanStride",
            },
          ],
          closingCallToAction: {
            spokenText: "Explore the collection.",
            onScreenText: "Explore UrbanStride",
            visualDirection: "Product detail with clear space for the CTA.",
          },
          captionSuggestion:
            "Every city journey starts with a comfortable first step.",
          hashtags: ["UrbanStride", "CityMovement"],
          productionNotes:
            "Synthetic planning content. No video or audio was generated.",
        },
      },
      {
        key: "seed-shot-list",
        type: "SHOT_LIST",
        snapshot: {
          ...videoBase,
          contentType: "SHOT_LIST",
          title: "UrbanStride Reel shot list",
          targetDurationSeconds: 30,
          shots: [
            {
              id: "shot-1",
              ordinal: 1,
              shotType: "CLOSE_UP",
              framing: "Tight product detail",
              subject: "UrbanStride shoe",
              action: "Steps onto a textured city pavement.",
              estimatedDurationSeconds: 8,
              cameraMovement: "Short forward track.",
            },
            {
              id: "shot-2",
              ordinal: 2,
              shotType: "WIDE",
              framing: "Full-body environmental frame",
              subject: "Urban commuter",
              action: "Crosses a station concourse.",
              estimatedDurationSeconds: 12,
              cameraMovement: "Stable lateral movement.",
            },
            {
              id: "shot-3",
              ordinal: 3,
              shotType: "PRODUCT_DETAIL",
              framing: "Low product angle",
              subject: "Shoe in motion",
              action: "Flexes naturally during a final city step.",
              estimatedDurationSeconds: 10,
            },
          ],
          equipmentNotes: ["Handheld stabilizer", "Natural-light reflector"],
          productionNotes:
            "Planning reference only; no media file was created.",
        },
      },
      {
        key: "seed-voice-over",
        type: "VOICE_OVER_SCRIPT",
        snapshot: {
          ...videoBase,
          contentType: "VOICE_OVER_SCRIPT",
          title: "UrbanStride Reel voice-over",
          targetDurationSeconds: 30,
          tone: "Clear, calm and confident.",
          sections: [
            {
              id: "voice-1",
              ordinal: 1,
              text: "The city rarely slows down, and neither do you.",
              deliveryDirection: "Measured opening with a short pause.",
              pauseAfter: true,
            },
            {
              id: "voice-2",
              ordinal: 2,
              text: "UrbanStride brings everyday comfort and considered design to every journey.",
              deliveryDirection: "Warm, practical emphasis on comfort.",
            },
            {
              id: "voice-3",
              ordinal: 3,
              text: "Explore the collection and move through the city in comfort.",
              deliveryDirection: "Confident closing invitation.",
            },
          ],
          pacingNotes: "Leave natural space between the three sections.",
        },
      },
      {
        key: "seed-video-caption",
        type: "VIDEO_CAPTION",
        snapshot: {
          ...videoBase,
          contentType: "VIDEO_CAPTION",
          title: "UrbanStride Reel caption",
          caption:
            "Every city journey starts with a comfortable first step. UrbanStride pairs everyday comfort with considered design.",
          callToAction: "Explore the collection",
          hashtags: ["UrbanStride", "CityMovement", "EverydayComfort"],
          accessibilityDescription:
            "A city commuter walks through a station wearing UrbanStride shoes.",
          notes: "Manual publishing is required.",
        },
      },
      {
        key: "seed-production-brief",
        type: "VIDEO_PRODUCTION_BRIEF",
        snapshot: {
          ...videoBase,
          contentType: "VIDEO_PRODUCTION_BRIEF",
          title: "UrbanStride Reel production brief",
          concept:
            "A calm, realistic city journey focused on the connection between movement and comfort.",
          targetAudience: "Urban professionals who walk or commute daily.",
          coreMessage: "Comfort and considered design for every city journey.",
          desiredResponse: "Viewers explore the fictional collection.",
          targetDurationSeconds: 30,
          visualDirection: {
            style: "Realistic editorial city movement.",
            composition: "Structured frames with clear product detail.",
            environment: "Modern station and walkable city streets.",
            colorDirection: "Navy, blue and neutral city tones.",
            lightingDirection: "Natural morning light.",
            avoid: [
              "Third-party logos",
              "Unsafe movement",
              "Artificial claims",
            ],
          },
          presenterDirection: {
            style: "NO_PRESENTER",
            delivery: "Use product and commuter action only.",
          },
          audioDirection: {
            musicMood: "Measured, optimistic rhythm.",
            voiceOverDirection: "Calm and practical delivery.",
          },
          editingDirection: {
            pace: "Controlled cuts aligned with walking steps.",
            transitions: ["Direct cut", "Match cut"],
            textTreatment: "Short, high-contrast text overlays.",
            captionTreatment: "Readable open captions in the safe area.",
          },
          deliverables: ["30-second vertical planning master", "Caption copy"],
          productionConstraints: ["No generated media", "No third-party marks"],
          notes: "Synthetic Phase 4.4 planning content.",
        },
      },
    ];
    for (const seeded of videoSnapshots) {
      const item =
        (await prisma.contentItem.findUnique({
          where: {
            projectId_module_identityKey: {
              projectId: urbanStride.id,
              module: "VIDEO",
              identityKey: seeded.key,
            },
          },
        })) ??
        (await prisma.contentItem.create({
          data: {
            id: `phase4-4-${seeded.key}`,
            projectId: urbanStride.id,
            module: "VIDEO",
            type: seeded.type,
            identityKey: seeded.key,
            title: seeded.snapshot.title,
            status: "DRAFT",
            sourceBrandProfileVersionId: profileVersion.id,
          },
        }));
      const version =
        (await prisma.contentItemVersion.findUnique({
          where: {
            contentItemId_versionNumber: {
              contentItemId: item.id,
              versionNumber: 1,
            },
          },
        })) ??
        (await prisma.contentItemVersion.create({
          data: {
            id: `phase4-4-${seeded.key}-v1`,
            contentItemId: item.id,
            versionNumber: 1,
            schemaVersion: "1.0",
            snapshot: seeded.snapshot,
            source: "GENERATED",
            brandProfileVersionId: profileVersion.id,
            mock: true,
            provenance: videoProvenance,
          },
        }));
      let currentVideoVersionId = version.id;
      if (seeded.type === "VIDEO_SCRIPT") {
        const editedSnapshot = {
          ...seeded.snapshot,
          productionNotes:
            "Synthetic Phase 4.4 manually reviewed planning content.",
        };
        const editedVersion =
          (await prisma.contentItemVersion.findUnique({
            where: {
              contentItemId_versionNumber: {
                contentItemId: item.id,
                versionNumber: 2,
              },
            },
          })) ??
          (await prisma.contentItemVersion.create({
            data: {
              id: `phase4-4-${seeded.key}-v2`,
              contentItemId: item.id,
              versionNumber: 2,
              schemaVersion: "1.0",
              snapshot: editedSnapshot,
              source: "MANUAL_EDIT",
              brandProfileVersionId: profileVersion.id,
              actorUserId: demo.id,
              mock: true,
              provenance: videoProvenance,
            },
          }));
        currentVideoVersionId = editedVersion.id;
      }
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { currentVersionId: currentVideoVersionId },
      });
      await prisma.contentItemVersion.deleteMany({
        where: {
          contentItemId: item.id,
          versionNumber: { gt: seeded.type === "VIDEO_SCRIPT" ? 2 : 1 },
        },
      });
    }
    await prisma.generationJob.deleteMany({
      where: { projectId: urbanStride.id, module: "VIDEO" },
    });

    const copySettings = CopyGenerationRequestSchema.parse({
      schemaVersion: "1.0",
      campaignName: "UrbanStride fictional launch",
      copyTypes: [
        "MARKETING_EMAIL",
        "PRODUCT_DESCRIPTION",
        "BLOG_OUTLINE",
        "ARTICLE_DRAFT",
        "FAQ_DOCUMENT",
        "COMPANY_BIO",
        "SALES_ONE_PAGER",
      ],
      quantity: 7,
      purpose: "CONVERT",
      topic: "Comfort and considered design for every city journey",
      audience: {
        summary: "Urban professionals who walk or commute daily",
        awarenessLevel: "SOLUTION_AWARE",
        painPoints: ["Uncomfortable daily footwear"],
        desiredOutcomes: ["Comfort throughout the day"],
      },
      productOrServiceFocus: "UrbanStride city footwear",
      desiredAction: "Explore the fictional collection",
      toneOverride: "BRAND_DEFAULT",
      lengthPreference: { value: "MEDIUM" },
      outputLanguage: "English",
      mockScenario: "success",
    });
    const copyTypes = copySettings.copyTypes;
    for (const [index, contentType] of copyTypes.entries()) {
      const itemKey = `seed-copy-${contentType.toLocaleLowerCase()}`;
      const request: CopyItemRequest = {
        kind: "COPY_ITEM_NEW",
        itemKey,
        contentType,
        ordinal: index + 1,
        settings: copySettings,
        brandProfileVersionId: profileVersion.id,
        scenario: "success",
      };
      const snapshot = createDeterministicCopySnapshot(
        request,
        BrandProfileSchema.parse(brandSnapshot),
        `phase4-5-copy-${index + 1}`,
      );
      const item =
        (await prisma.contentItem.findUnique({
          where: {
            projectId_module_identityKey: {
              projectId: urbanStride.id,
              module: "COPY",
              identityKey: itemKey,
            },
          },
        })) ??
        (await prisma.contentItem.create({
          data: {
            id: `phase4-5-copy-${index + 1}`,
            projectId: urbanStride.id,
            module: "COPY",
            type: contentType,
            identityKey: itemKey,
            title: snapshot.title,
            status: "DRAFT",
            sourceBrandProfileVersionId: profileVersion.id,
          },
        }));
      const generated =
        (await prisma.contentItemVersion.findUnique({
          where: {
            contentItemId_versionNumber: {
              contentItemId: item.id,
              versionNumber: 1,
            },
          },
        })) ??
        (await prisma.contentItemVersion.create({
          data: {
            id: `phase4-5-copy-${index + 1}-v1`,
            contentItemId: item.id,
            versionNumber: 1,
            schemaVersion: "1.0",
            snapshot,
            source: "GENERATED",
            brandProfileVersionId: profileVersion.id,
            mock: true,
            provenance: snapshot.provenance,
          },
        }));
      let currentCopyVersionId = generated.id;
      if (contentType === "MARKETING_EMAIL") {
        const editedSnapshot = {
          ...snapshot,
          opening:
            "Every city journey deserves comfort that fits the reality of the day.",
        };
        const edited =
          (await prisma.contentItemVersion.findUnique({
            where: {
              contentItemId_versionNumber: {
                contentItemId: item.id,
                versionNumber: 2,
              },
            },
          })) ??
          (await prisma.contentItemVersion.create({
            data: {
              id: "phase4-5-copy-email-v2",
              contentItemId: item.id,
              versionNumber: 2,
              schemaVersion: "1.0",
              snapshot: editedSnapshot,
              source: "MANUAL_EDIT",
              brandProfileVersionId: profileVersion.id,
              actorUserId: demo.id,
              mock: true,
              provenance: snapshot.provenance,
            },
          }));
        currentCopyVersionId = edited.id;
      }
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { currentVersionId: currentCopyVersionId },
      });
      await prisma.contentItemVersion.deleteMany({
        where: {
          contentItemId: item.id,
          versionNumber: {
            gt: contentType === "MARKETING_EMAIL" ? 2 : 1,
          },
        },
      });
    }

    const calendarSnapshot = CalendarSnapshotSchema.parse({
      schemaVersion: "1.0",
      contentType: "EDITORIAL_CALENDAR",
      title: "UrbanStride August editorial calendar",
      planningPeriod: {
        startDate: "2026-08-03",
        endDate: "2026-08-30",
        timezone: "Europe/Lisbon",
      },
      strategySummary:
        "A fictional four-week editorial plan for the UrbanStride launch.",
      entries: [
        {
          id: "entry-urbanstride-1",
          ordinal: 1,
          scheduledDate: "2026-08-03",
          scheduledTime: "09:00",
          timezone: "Europe/Lisbon",
          module: "SOCIAL",
          channel: "INSTAGRAM",
          objective: "AWARENESS",
          status: "PLANNED",
          title: "Comfort for the city journey",
          summary:
            "Introduce the fictional UrbanStride promise through a practical city story.",
          source: { type: "PLANNED_PLACEHOLDER" },
          publishingNotes:
            "Planning only — no external scheduling or publishing occurred.",
        },
        {
          id: "entry-urbanstride-2",
          ordinal: 2,
          scheduledDate: "2026-08-06",
          scheduledTime: "14:00",
          timezone: "Europe/Lisbon",
          module: "COPY",
          channel: "EMAIL",
          objective: "PRODUCT_LAUNCH",
          status: "DRAFT_READY",
          title: "UrbanStride launch email",
          summary: "Connect the launch message to everyday movement.",
          source: { type: "PLANNED_PLACEHOLDER" },
          publishingNotes:
            "Planning only — delivery must be handled outside Web Content Flow.",
        },
      ],
      recommendations: [
        "Review every entry before manually scheduling or publishing.",
      ],
      risksOrGaps: ["Both entries still require a linked content item."],
      provenance: {
        provider: "mock",
        model: "mock-calendar-v1",
        promptVersion: "calendar-1.0",
        schemaVersion: "1.0",
        requestId: "phase4-6-calendar-request",
        generationJobId: null,
        brandProfileVersionId: profileVersion.id,
        generatedAt: "2026-01-01T00:00:00.000Z",
        mock: true,
      },
    });
    await prisma.projectModule.upsert({
      where: {
        projectId_module: {
          projectId: urbanStride.id,
          module: "CALENDAR",
        },
      },
      update: { status: "COMPLETE" },
      create: {
        projectId: urbanStride.id,
        module: "CALENDAR",
        status: "COMPLETE",
        settings: {
          schemaVersion: "1.0",
          calendarType: "EDITORIAL_CALENDAR",
          planningPeriod:
            calendarSnapshot.contentType === "EDITORIAL_CALENDAR"
              ? calendarSnapshot.planningPeriod
              : {
                  startDate: "2026-08-03",
                  endDate: "2026-08-30",
                  timezone: "Europe/Lisbon",
                },
          modules: ["SOCIAL", "COPY"],
          channels: ["INSTAGRAM", "EMAIL"],
          cadence: { weeklyTarget: 2 },
          objectives: ["AWARENESS", "PRODUCT_LAUNCH"],
          sourceSelection: {
            strategy: "PLAN_NEW_CONTENT",
            includeUnscheduledExistingContent: false,
            allowPlannedPlaceholders: true,
          },
          outputLanguage: "English",
          mockScenario: "success",
        },
      },
    });
    const calendarItem =
      (await prisma.contentItem.findUnique({
        where: {
          projectId_module_identityKey: {
            projectId: urbanStride.id,
            module: "CALENDAR",
            identityKey: "seed-editorial-calendar-2026-08",
          },
        },
      })) ??
      (await prisma.contentItem.create({
        data: {
          id: "phase4-6-urbanstride-calendar",
          projectId: urbanStride.id,
          module: "CALENDAR",
          type: "EDITORIAL_CALENDAR",
          identityKey: "seed-editorial-calendar-2026-08",
          title: calendarSnapshot.title,
          status: "DRAFT",
          sourceBrandProfileVersionId: profileVersion.id,
        },
      }));
    const generatedCalendarVersion =
      (await prisma.contentItemVersion.findUnique({
        where: {
          contentItemId_versionNumber: {
            contentItemId: calendarItem.id,
            versionNumber: 1,
          },
        },
      })) ??
      (await prisma.contentItemVersion.create({
        data: {
          id: "phase4-6-urbanstride-calendar-v1",
          contentItemId: calendarItem.id,
          versionNumber: 1,
          schemaVersion: "1.0",
          snapshot: calendarSnapshot,
          source: "GENERATED",
          brandProfileVersionId: profileVersion.id,
          mock: true,
          provenance: calendarSnapshot.provenance,
        },
      }));
    const reviewedCalendarVersion =
      (await prisma.contentItemVersion.findUnique({
        where: {
          contentItemId_versionNumber: {
            contentItemId: calendarItem.id,
            versionNumber: 2,
          },
        },
      })) ??
      (await prisma.contentItemVersion.create({
        data: {
          id: "phase4-6-urbanstride-calendar-v2",
          contentItemId: calendarItem.id,
          versionNumber: 2,
          schemaVersion: "1.0",
          snapshot: {
            ...calendarSnapshot,
            notes:
              "Synthetic Phase 4.6 calendar reviewed for implementation testing.",
          },
          source: "MANUAL_EDIT",
          brandProfileVersionId: profileVersion.id,
          actorUserId: demo.id,
          mock: true,
          provenance: calendarSnapshot.provenance,
        },
      }));
    await prisma.contentItem.update({
      where: { id: calendarItem.id },
      data: { currentVersionId: reviewedCalendarVersion.id },
    });
    await prisma.contentItemVersion.deleteMany({
      where: {
        contentItemId: calendarItem.id,
        versionNumber: { gt: 2 },
      },
    });
    void generatedCalendarVersion;

    const phase5Job = await prisma.generationJob.upsert({
      where: {
        projectId_idempotencyKey: {
          projectId: urbanStride.id,
          idempotencyKey: "seed-phase5-repaired-generation",
        },
      },
      update: {},
      create: {
        id: "phase5-urbanstride-real-job",
        projectId: urbanStride.id,
        scopeType: "CONTENT_ITEM",
        scopeId: calendarItem.id,
        module: "COPY",
        status: "COMPLETED",
        mode: "REAL",
        provider: "OPENAI",
        modelTier: "REPAIR",
        modelId: "synthetic-phase5-model",
        promptKey: "copy.foundation_copy.generation",
        promptVersion: "1.0.0",
        generationPurpose: "ITEM_GENERATION",
        briefRevision: 1,
        providerAttemptCount: 2,
        repairAttempted: true,
        idempotencyKey: "seed-phase5-repaired-generation",
        request: { synthetic: true, scenario: "repair-success" },
        usage: { synthetic: true },
        completedAt: new Date("2026-07-26T12:00:00.000Z"),
      },
    });
    await prisma.generationUsage.upsert({
      where: {
        generationJobId_attemptNumber_repair: {
          generationJobId: phase5Job.id,
          attemptNumber: 1,
          repair: false,
        },
      },
      update: {},
      create: {
        projectId: urbanStride.id,
        userId: demo.id,
        generationJobId: phase5Job.id,
        provider: "OPENAI",
        modelId: "synthetic-phase5-model",
        modelTier: "STANDARD",
        promptKey: "copy.foundation_copy.generation",
        promptVersion: "1.0.0",
        generationPurpose: "ITEM_GENERATION",
        attemptNumber: 1,
        repair: false,
        usageSource: "UNAVAILABLE",
      },
    });
    await prisma.generationUsage.upsert({
      where: {
        generationJobId_attemptNumber_repair: {
          generationJobId: phase5Job.id,
          attemptNumber: 2,
          repair: true,
        },
      },
      update: {},
      create: {
        projectId: urbanStride.id,
        userId: demo.id,
        generationJobId: phase5Job.id,
        provider: "OPENAI",
        modelId: "synthetic-phase5-repair-model",
        modelTier: "REPAIR",
        promptKey: "copy.foundation_copy.generation.repair",
        promptVersion: "1.0.0",
        generationPurpose: "STRUCTURAL_REPAIR",
        attemptNumber: 2,
        repair: true,
        inputTokens: 320,
        outputTokens: 180,
        totalTokens: 500,
        usageSource: "ESTIMATED",
      },
    });

    await prisma.user.upsert({
      where: { email: "empty@webcontentflow.local" },
      update: { name: "Empty Workspace", passwordHash },
      create: {
        id: "phase1-empty-user",
        email: "empty@webcontentflow.local",
        name: "Empty Workspace",
        passwordHash,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed.";
  console.error(message);
  process.exitCode = 1;
});
