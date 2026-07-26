export const validBrief = {
  schemaVersion: "1.0",
  project: {
    projectName: "UrbanStride Launch",
    brandName: "UrbanStride",
    projectType: "E-commerce",
    businessDescription: "An online footwear business for urban commuters.",
    productOrService: "Comfortable walking shoes designed for daily city use.",
    currentWebsite: "https://example.invalid",
  },
  audience: {
    targetAudience: "Urban professionals who walk or commute daily",
    ageRange: "25–45",
    location: "European cities",
    interests: ["walking", "design"],
    customerProblem: "Daily footwear is uncomfortable or visually generic.",
    valueProposition: "Comfort and considered design for every city journey.",
  },
  objective: {
    primaryObjective: "Launch the first direct-to-consumer collection",
    desiredCustomerAction: "Explore the collection",
    primaryOffer: "Versatile city shoes with all-day comfort",
    campaignContext: "Fictional launch campaign",
  },
  direction: {
    toneOfVoice: "Clear, confident, practical",
    visualStyle: "Editorial urban photography with structured layouts",
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
} as const;
