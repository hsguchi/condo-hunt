import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const body = event.body ? JSON.parse(event.body) : {};

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      url: body.url ?? null,
      message: "Listing import stub is ready for Firecrawl and Airtable wiring."
    })
  };
};
