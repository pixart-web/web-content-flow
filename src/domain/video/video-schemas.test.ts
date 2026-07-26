import { describe, expect, it } from "vitest";

import {
  ShotListSnapshotSchema,
  VideoGenerationRequestSchema,
  VideoScriptSnapshotSchema,
} from "./video-schemas";

const provenance = {
  provider: "mock",
  model: "mock-video-v1",
  promptVersion: "video-1.0",
  schemaVersion: "1.0",
  requestId: "video-request-1234",
  generationJobId: null,
  brandProfileVersionId: "profile-version-1234",
  generatedAt: "2026-01-01T00:00:00.000Z",
  mock: true,
} as const;
const base = {
  schemaVersion: "1.0",
  platform: "INSTAGRAM_REELS",
  format: "REEL",
  objective: "AWARENESS",
  title: "UrbanStride city movement",
  provenance,
} as const;

describe("Video contracts", () => {
  it("validates bounded setup and content-type compatibility", () => {
    const request = {
      schemaVersion: "1.0",
      platforms: ["INSTAGRAM_REELS"],
      formats: ["REEL"],
      objectives: ["AWARENESS"],
      assetTypes: ["VIDEO_SCRIPT", "SHOT_LIST", "VIDEO_CAPTION"],
      conceptCount: 2,
      duration: { range: "UP_TO_30_SECONDS" },
      topic: "Daily comfort for city commuters",
      presenterStyle: "MIXED",
      outputLanguage: "English",
      includeOnScreenText: true,
      includeVoiceOver: true,
      includeCaption: true,
      includeShotList: true,
      mockScenario: "success",
    } as const;
    expect(VideoGenerationRequestSchema.safeParse(request).success).toBe(true);
    expect(
      VideoGenerationRequestSchema.safeParse({
        ...request,
        platforms: ["TIKTOK", "TIKTOK"],
      }).success,
    ).toBe(false);
    expect(
      VideoGenerationRequestSchema.safeParse({
        ...request,
        duration: { range: "CUSTOM" },
      }).success,
    ).toBe(false);
    expect(
      VideoGenerationRequestSchema.safeParse({
        ...request,
        assetTypes: ["SHOT_LIST"],
        includeShotList: false,
      }).success,
    ).toBe(false);
  });

  it("enforces unique scene identity, order, duration and strict fields", () => {
    const script = {
      ...base,
      contentType: "VIDEO_SCRIPT",
      conceptSummary: "Follow one commuter through a comfortable city day.",
      targetDurationSeconds: 30,
      hook: { visualDirection: "Close-up of shoes stepping onto pavement." },
      scenes: [
        {
          id: "scene-1",
          ordinal: 1,
          estimatedDurationSeconds: 15,
          purpose: "Introduce the problem",
          visualDirection: "Morning commuter walking quickly.",
        },
        {
          id: "scene-2",
          ordinal: 2,
          estimatedDurationSeconds: 15,
          purpose: "Show the outcome",
          visualDirection: "Relaxed arrival after the commute.",
        },
      ],
    } as const;
    expect(VideoScriptSnapshotSchema.safeParse(script).success).toBe(true);
    expect(
      VideoScriptSnapshotSchema.safeParse({
        ...script,
        scenes: script.scenes.map((scene) => ({ ...scene, id: "scene-1" })),
      }).success,
    ).toBe(false);
    expect(
      VideoScriptSnapshotSchema.safeParse({
        ...script,
        targetDurationSeconds: 90,
      }).success,
    ).toBe(false);
    expect(
      VideoScriptSnapshotSchema.safeParse({ ...script, html: "<b>no</b>" })
        .success,
    ).toBe(false);
  });

  it("enforces ordered unique shots and bounded strings", () => {
    const shot = {
      ...base,
      contentType: "SHOT_LIST",
      targetDurationSeconds: 30,
      shots: [
        {
          id: "shot-1",
          ordinal: 1,
          shotType: "WIDE",
          framing: "Full body",
          subject: "Urban commuter",
          action: "Walks through a station.",
        },
        {
          id: "shot-2",
          ordinal: 2,
          shotType: "PRODUCT_DETAIL",
          framing: "Tight product detail",
          subject: "UrbanStride shoe",
          action: "Flexes naturally while walking.",
        },
      ],
    } as const;
    expect(ShotListSnapshotSchema.safeParse(shot).success).toBe(true);
    expect(
      ShotListSnapshotSchema.safeParse({
        ...shot,
        shots: shot.shots.map((value) => ({ ...value, ordinal: 1 })),
      }).success,
    ).toBe(false);
    expect(
      ShotListSnapshotSchema.safeParse({
        ...shot,
        shots: [{ ...shot.shots[0], action: "x".repeat(501) }],
      }).success,
    ).toBe(false);
  });
});
