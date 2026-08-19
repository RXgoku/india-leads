export type Industry = "roofing" | "dental";

export type PlaceLead = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
};

const INDUSTRY_QUERIES: Record<Industry, string> = {
  roofing: "roofing contractors",
  dental: "dental clinics",
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
].join(",");

type PlacesTextSearchResponse = {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
  }>;
};

export async function searchPlaces(
  industry: Industry,
  cityName: string,
  stateName: string
): Promise<PlaceLead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const textQuery = `${INDUSTRY_QUERIES[industry]} in ${cityName}, ${stateName}, India`;

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 3,
      languageCode: "en",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Places API request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as PlacesTextSearchResponse;

  return (data.places ?? []).map((place) => ({
    placeId: place.id,
    name: place.displayName?.text ?? "Unknown business",
    address: place.formattedAddress ?? "Address unavailable",
    phone: place.nationalPhoneNumber ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    websiteUri: place.websiteUri ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
  }));
}

// Hosts that mean the business doesn't really have its own website — just a
// social page, a free Google site, or a directory listing. Still a lead, but
// a weaker one than a business with no web presence flagged the same way.
const WEAK_WEBSITE_HOSTS = [
  "facebook.com",
  "instagram.com",
  "business.site",
  "justdial.com",
  "indiamart.com",
  "linkedin.com",
];

export function hasRealWebsite(websiteUri: string | null): boolean {
  if (!websiteUri) return false;
  try {
    const host = new URL(websiteUri).hostname.replace(/^www\./, "");
    return !WEAK_WEBSITE_HOSTS.some((weak) => host === weak || host.endsWith(`.${weak}`));
  } catch {
    return false;
  }
}
