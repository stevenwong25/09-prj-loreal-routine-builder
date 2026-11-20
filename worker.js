// This Cloudflare Worker sends chat messages to OpenAI.
// The API key is stored as a Cloudflare secret named OPENAI_API_KEY.

// OpenAI Responses API endpoint.

const systemMessage = ``;

export default {
  async fetch(request, env) {
    // Allow the browser to send requests from the project page.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // Browsers send an OPTIONS request before some POST requests.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Only POST requests are accepted.
    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Please use POST to call this worker." },
        405,
        corsHeaders
      );
    }



    try {
      // Read the conversation and product catalog sent by script.js.
      const body = await request.json();
      const messages = body.messages;
      const products = body.products;
      const apiKey = env.OPENAI_API_KEY;
      const apiUrl = "https://api.openai.com/v1/responses";

      // Make sure the frontend sent a valid conversation.
      if (!Array.isArray(messages) || messages.length === 0) {
        return jsonResponse(
          { error: "A messages array is required." },
          400,
          corsHeaders
        );
      }

      // Add the full product catalog as context for the OpenAI request.
      const input = Array.isArray(products)
        ? [
            {
              role: "system",
              content: `Product catalog: ${JSON.stringify(products)}`,
            },
            ...messages,
          ]
        : messages;

      // Send the conversation to OpenAI using the secret API key.
      const openAiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          instructions: systemMessage,
          store: false,
          tools: [{type: "web_search", search_context_size: "medium"}],
          max_output_tokens: 800,
          input: input
        }),
      });

      const data = await openAiResponse.json();

      // Pass an OpenAI error back to the browser in a readable way.
      if (!openAiResponse.ok) {
        return jsonResponse(
          {
            error: data.error?.message || "OpenAI could not complete the request.",
          },
          openAiResponse.status,
          corsHeaders
        );
      }

      // Return OpenAI's response in the format expected by script.js.
      return jsonResponse(data, 200, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: error.message || "The worker could not process the request." },
        500,
        corsHeaders
      );
    }
  },
};

// Convert a JavaScript object into a JSON HTTP response.
function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}