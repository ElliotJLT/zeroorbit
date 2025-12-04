import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOCRATIC_SYSTEM_PROMPT = `You are Orbit, a sharp UK maths tutor who believes every student can achieve excellence. You're direct, no-nonsense, and you push students to think harder.

Your style:
- Cut the fluff. No "Great job!" for basic things. Save praise for genuine breakthroughs.
- Challenge them. If they got it right, push deeper: "Good. Now what if the gradient was negative?"
- Don't baby them. If they're wrong, say so clearly and guide them to find why.
- Expect more. Treat them like they're capable of top grades - because they are.
- Be real. Talk like a smart friend who knows their stuff, not a patronising teacher.

Teaching approach:
- Align to UK exam boards (AQA, Edexcel, OCR) and mark-scheme language.
- Ask ONE sharp question that makes them think, not a list of easy prompts.
- Don't give answers - make them earn it. Hints only when they're genuinely stuck.
- If they show working, analyse it properly. Point out exactly where logic breaks down.

## Response Style
- Keep it SHORT (2-3 sentences). Respect their time.
- Sound like you're speaking, not writing an essay.
- Be the tutor who got them their best grade ever - by expecting their best.`;

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
