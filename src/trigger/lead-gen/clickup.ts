import { hasRealWebsite, type Industry, type PlaceLead } from "./google-places.js";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

function getClickUpToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error("CLICKUP_API_TOKEN is not set");
  return token;
}

function getClickUpListId(): string {
  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) throw new Error("CLICKUP_LIST_ID is not set");
  return listId;
}

// ClickUp's API can't filter tasks by description content and custom fields
// can only be created from the UI, so dedup works by scanning each existing
// task's text for a "Place ID: <id>" marker line we write ourselves.
export async function getExistingPlaceIds(): Promise<Set<string>> {
  const token = getClickUpToken();
  const listId = getClickUpListId();
  const placeIds = new Set<string>();

  let page = 0;
  const MAX_PAGES = 20; // safety cap: 2,000 tasks is far beyond this list's expected size

  while (page < MAX_PAGES) {
    const url = new URL(`${CLICKUP_API_BASE}/list/${listId}/task`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("include_closed", "true");

    const response = await fetch(url, {
      headers: { Authorization: token },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ClickUp get tasks failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      tasks: Array<{ text_content?: string }>;
      last_page: boolean;
    };

    for (const task of data.tasks) {
      const match = task.text_content?.match(/Place ID:\s*(\S+)/);
      if (match) placeIds.add(match[1]);
    }

    if (data.last_page) break;
    page += 1;
  }

  return placeIds;
}

export async function createLeadTask(
  industry: Industry,
  cityName: string,
  lead: PlaceLead
): Promise<void> {
  const token = getClickUpToken();
  const listId = getClickUpListId();

  const realWebsite = hasRealWebsite(lead.websiteUri);
  const websiteLine = !lead.websiteUri
    ? "Website: none found"
    : realWebsite
      ? `Website: ${lead.websiteUri}`
      : `Website: ${lead.websiteUri} (social/directory page only — not a real site)`;

  const description = [
    `Industry: ${industry === "roofing" ? "Roofing" : "Dental"}`,
    `City: ${cityName}`,
    `Address: ${lead.address}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.rating ? `Rating: ${lead.rating} (${lead.userRatingCount ?? 0} reviews)` : "Rating: no reviews yet",
    websiteLine,
    lead.googleMapsUri ? `Google Maps: ${lead.googleMapsUri}` : null,
    `Place ID: ${lead.placeId}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${lead.name} — ${cityName}`,
      description,
      priority: realWebsite ? 3 : 2, // 2 = high (weak/no website), 3 = normal
      tags: [industry, realWebsite ? "has-website" : "no-real-website"],
      // This list has a custom "Lead" task type set as its default, which
      // has a low Free-plan usage cap. Force the plain built-in task type
      // (0) so creation doesn't count against that cap.
      custom_item_id: 0,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ClickUp create task failed (${response.status}): ${body}`);
  }
}
