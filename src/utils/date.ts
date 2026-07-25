export function getLisbonDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
}
