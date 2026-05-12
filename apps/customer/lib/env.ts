import { createApiClient } from "@mizrahitality/contracts";

/** Base URL of the Builder app's REST API (the only channel between the two apps). */
export const BUILDER_API_URL: string = process.env.BUILDER_API_URL ?? "http://localhost:5111";

/** Pre-configured client for the Builder REST API. */
export const apiClient = createApiClient({ baseUrl: BUILDER_API_URL });
