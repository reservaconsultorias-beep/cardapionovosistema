export function getLisbonDate() {
  try {
    const now = new Date();
    const lisbonString = now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" });
    const parsed = new Date(lisbonString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {}
  return new Date();
}
