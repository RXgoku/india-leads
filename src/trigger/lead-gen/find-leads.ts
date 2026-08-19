import { schedules } from "@trigger.dev/sdk";
import { getCitiesForWeek } from "./cities.js";
import { searchPlaces, type Industry } from "./google-places.js";
import { getExistingPlaceIds } from "./clickup.js";
import { processLead } from "./process-lead.js";

const INDUSTRIES: Industry[] = ["roofing", "dental"];

export const findLeads = schedules.task({
  id: "find-india-leads",
  cron: {
    pattern: "0 8 * * 1",
    timezone: "Asia/Calcutta",
  },

  run: async () => {
    const cities = getCitiesForWeek();
    const existingPlaceIds = await getExistingPlaceIds();

    let dispatched = 0;
    let skipped = 0;

    for (const city of cities) {
      for (const industry of INDUSTRIES) {
        let leads;
        try {
          leads = await searchPlaces(industry, city.name, city.state);
        } catch (error) {
          console.error(`Search failed for ${industry} in ${city.name}:`, error);
          continue;
        }

        for (const lead of leads) {
          if (existingPlaceIds.has(lead.placeId)) {
            skipped += 1;
            continue;
          }

          await processLead.trigger(
            { industry, cityName: city.name, lead },
            { idempotencyKey: `lead-${lead.placeId}` }
          );
          existingPlaceIds.add(lead.placeId);
          dispatched += 1;
        }
      }
    }

    return { cities: cities.map((c) => c.name), dispatched, skipped };
  },
});
