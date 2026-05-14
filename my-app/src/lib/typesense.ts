import { Client } from "typesense";

let tsClient: Client | null = null;

export function getTypesenseClient(): Client {
  if (!tsClient) {
    const host   = process.env.TYPESENSE_HOST;
    const apiKey = process.env.TYPESENSE_SEARCH_KEY;

    if (!host || !apiKey) {
      throw new Error("Missing TYPESENSE_HOST or TYPESENSE_SEARCH_KEY environment variables");
    }

    tsClient = new Client({
      nodes: [{ host, port: 443, protocol: "https" }],
      apiKey,
      connectionTimeoutSeconds: 5,
    });
  }
  return tsClient;
}

export const UNITS_COLLECTION   = "units";
export const AOS_COLLECTION     = "aos";
export const COURSES_COLLECTION = "courses";