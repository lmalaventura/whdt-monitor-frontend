const agentServiceUrl =
  process.env.AGENT_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const upstreamResponse = await fetch(`${agentServiceUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("content-type") || "application/json",
      },
      body,
      cache: "no-store",
    });

    const responseBody = await upstreamResponse.arrayBuffer();

    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") ||
          "application/json",
      },
    });
  } catch (error) {
    console.error("Agent Service request failed:", error);

    return Response.json(
      {
        detail: "Unable to reach the Agent Service.",
      },
      {
        status: 502,
      },
    );
  }
}