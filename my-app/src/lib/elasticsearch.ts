import { Client } from "@elastic/elasticsearch";

let esClient: Client | null = null;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;
    const apiKey = process.env.ELASTICSEARCH_API_KEY;

    if (!cloudId || !apiKey) {
      throw new Error(
        "Missing ELASTICSEARCH_CLOUD_ID or ELASTICSEARCH_API_KEY environment variables"
      );
    }

    esClient = new Client({
      cloud: { id: cloudId },
      auth: { apiKey },
    });
  }
  return esClient;
}

export const UNITS_INDEX = "units";
