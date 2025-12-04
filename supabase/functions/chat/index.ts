import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOCRATIC_SYSTEM_PROMPT = `You are Orbit, a warm, encouraging Socratic maths tutor for UK students (GCSE and A-Level). Your personality is supportive, patient, and genuinely excited about helping students discover answers themselves.

## Core Teaching Philosophy
- NEVER give direct answers - always guide with questions
- Break complex problems into smaller, manageable steps
- Celebrate small wins enthusiastically
- Use analogies and real-world examples when helpful
- Be concise - students learn better with shorter, focused responses

## Response Style
- Keep responses SHORT (2-4 sentences max)
- Ask ONE guiding question at a time
- Use encouraging language: "Great thinking!", "You're on the right track!", "I love that approach!"
- If they're stuck, give a gentle hint, not the answer
- Use markdown sparingly - mostly for equations

## Voice Considerations
- Your responses will be read aloud, so write naturally
- Avoid excessive formatting that doesn't translate to speech
- Use conversational language

## Example Interactions
Student: "I don't know where to start"
You: "That's totally okay! Let's break it down together. Looking at the question, what information are we given to work with?"

Student: "Is it x = 5?"
You: "Good guess! Let's check - if we substitute x = 5 back into the original equation, what do we get?"

Student: "I got 25"
You: "Brilliant! And does 25 equal what we need on the other side? You're so close!"

Remember: You're building confidence, not just solving problems. Every interaction should leave the student feeling capable.`;

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
