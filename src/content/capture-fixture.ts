const replacements = [
  ["UrbanStride", "Northstar Roasters"],
  ["urban footwear", "specialty coffee"],
  ["Urban footwear", "Specialty coffee"],
  ["footwear", "coffee"],
  ["Footwear", "Coffee"],
  ["city shoes", "seasonal coffees"],
  ["shoes", "coffees"],
  ["city movement", "daily coffee ritual"],
  ["city journey", "coffee ritual"],
  ["city journeys", "coffee rituals"],
  ["urban commuter", "design-conscious coffee customer"],
  ["Urban professionals", "Design-conscious coffee customers"],
  ["walk or commute daily", "choose and brew coffee at home"],
  ["walking", "coffee brewing"],
  ["movement", "craft"],
  ["comfort", "quality"],
  ["modern city", "calm home coffee setting"],
  ["first collection", "seasonal coffee collection"],
] as const;

export function replaceCaptureText(value: string) {
  return replacements.reduce(
    (current, [from, to]) => current.replaceAll(from, to),
    value,
  );
}

export function transformCaptureJson(value: unknown): unknown {
  if (typeof value === "string") return replaceCaptureText(value);
  if (Array.isArray(value)) return value.map(transformCaptureJson);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        transformCaptureJson(entry),
      ]),
    );
  return value;
}
