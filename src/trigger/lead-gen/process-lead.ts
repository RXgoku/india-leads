import { task } from "@trigger.dev/sdk";
import { createLeadTask } from "./clickup.js";
import type { Industry, PlaceLead } from "./google-places.js";

export const processLead = task({
  id: "process-lead",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 20_000,
  },
  run: async (payload: { industry: Industry; cityName: string; lead: PlaceLead }) => {
    await createLeadTask(payload.industry, payload.cityName, payload.lead);
    return { placeId: payload.lead.placeId, name: payload.lead.name };
  },
});
