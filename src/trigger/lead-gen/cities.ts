export type City = { name: string; state: string };

// 25 cities spread across India, grouped into 5 rotation groups so the
// whole country cycles through roughly every 5 weeks.
const CITY_GROUPS: City[][] = [
  [
    { name: "Mumbai", state: "Maharashtra" },
    { name: "Delhi", state: "Delhi" },
    { name: "Bengaluru", state: "Karnataka" },
    { name: "Chennai", state: "Tamil Nadu" },
    { name: "Kolkata", state: "West Bengal" },
  ],
  [
    { name: "Hyderabad", state: "Telangana" },
    { name: "Pune", state: "Maharashtra" },
    { name: "Ahmedabad", state: "Gujarat" },
    { name: "Jaipur", state: "Rajasthan" },
    { name: "Lucknow", state: "Uttar Pradesh" },
  ],
  [
    { name: "Surat", state: "Gujarat" },
    { name: "Nagpur", state: "Maharashtra" },
    { name: "Indore", state: "Madhya Pradesh" },
    { name: "Bhopal", state: "Madhya Pradesh" },
    { name: "Patna", state: "Bihar" },
  ],
  [
    { name: "Vadodara", state: "Gujarat" },
    { name: "Coimbatore", state: "Tamil Nadu" },
    { name: "Kochi", state: "Kerala" },
    { name: "Chandigarh", state: "Chandigarh" },
    { name: "Guwahati", state: "Assam" },
  ],
  [
    { name: "Visakhapatnam", state: "Andhra Pradesh" },
    { name: "Nashik", state: "Maharashtra" },
    { name: "Ludhiana", state: "Punjab" },
    { name: "Agra", state: "Uttar Pradesh" },
    { name: "Bhubaneswar", state: "Odisha" },
  ],
];

// Anchored to a known Monday so the rotation is deterministic across runs
// without needing any stored state between weeks.
const ROTATION_EPOCH = Date.UTC(2024, 0, 1); // Monday, Jan 1 2024
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getCitiesForWeek(date: Date = new Date()): City[] {
  const weeksSinceEpoch = Math.floor((date.getTime() - ROTATION_EPOCH) / WEEK_MS);
  const groupIndex =
    ((weeksSinceEpoch % CITY_GROUPS.length) + CITY_GROUPS.length) % CITY_GROUPS.length;
  return CITY_GROUPS[groupIndex];
}
