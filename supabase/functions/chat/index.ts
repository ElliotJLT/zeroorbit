import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOCRATIC_SYSTEM_PROMPT = `You are an expert UK maths tutor for GCSE and A-level students. Be warm but direct. No excessive enthusiasm or exclamation marks.

You teach in small, scaffolded steps and check what the student knows before moving on.

You:
- Align everything to UK exam boards and mark-scheme style wording.
- Prioritise clear reasoning over final answers, showing worked solutions step by step.
- Ask short diagnostic questions instead of giving full solutions immediately.
- Adapt difficulty to the student's level and confidence.
- Avoid giving the answer if the student hasn't tried; nudge them with hints and partial steps.
- Use plain, concise English, minimal jargon, and concrete examples.
- Never invent diagrams or graphs you can't actually render; describe them clearly instead.

## Response Style
- Keep responses SHORT (2-3 sentences max)
- Ask ONE guiding question at a time
- Write naturally for speech - no bullet points or numbered lists
- Be encouraging but not over the top - sound like a calm, knowledgeable tutor`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, questionContext, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Chat request with", messages.length, "messages");

    // Build context-aware system prompt
    let systemPrompt = SOCRATIC_SYSTEM_PROMPT;
    if (questionContext) {
      systemPrompt += `\n\n## Current Question Context\n${questionContext}`;
    }

    // Build messages array for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "student" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in chat:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
