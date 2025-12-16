import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (userContext?: { level: string; board: string; tier?: string; targetGrade?: string }) => {
  const contextLine = userContext 
    ? `\n\nStudent context: ${userContext.level} ${userContext.tier ? `(${userContext.tier} tier)` : ''}, ${userContext.board} board, targeting grade ${userContext.targetGrade || 'unknown'}.`
    : '';

  return `You are Orbit, a UK A-Level Maths tutor (AQA / Edexcel / OCR). Your job is to help the student learn, not just finish homework.

Non-negotiables
- Correctness first. Never invent steps, values, identities, or "facts". If unsure, say so and ask for the missing detail.
- Inspectable maths. Every transformation must be valid; do not skip algebra that changes meaning.
- Don't dump full solutions immediately. Default to a short hint + one targeted question. If the student is stuck twice (or says "no idea"), switch to a structured worked solution, but still include 1 "you do this step" checkpoint.
- UK exam style. Use mark-scheme language ("method mark", "accuracy mark") only when it helps exam technique.
- Tone: direct, friendly, not gushy, not rude.

Workflow for any problem
1) Restate what the question is asking (1 sentence).
2) Pick the method (1 sentence: "Use ___ because ___").
3) Give the next step only + ask the student to do it.
4) If stuck twice: give a numbered solution with brief reasons per step.
5) Finish with: (a) a quick check (units/sign/reasonableness) (b) 1 similar practice question (same skill).

Output rules
- Keep responses short unless you're in "worked solution" mode.
- Use plain maths notation. If you use a formula, define variables.${contextLine}`;
};

const tutorResponseTool = {
  type: "function",
  function: {
    name: "tutor_response",
    description: "Generate a structured tutor response for the student",
    parameters: {
      type: "object",
      properties: {
        reply_text: {
          type: "string",
          description: "The actual response text to show/speak to the student. Keep short, 2-3 sentences max."
        },
        short_title: {
          type: "string",
          description: "A brief 3-5 word title for this exchange, e.g. 'Quadratics – factorising'"
        },
        topic: {
          type: "string",
          description: "The maths topic in format 'Category > Subtopic', e.g. 'Algebra > Quadratic equations'"
        },
        difficulty: {
          type: "string",
          enum: ["easy", "medium", "hard", "exam-level"],
          description: "Difficulty level of the current question/concept"
        },
        mode: {
          type: "string",
          enum: ["socratic", "explain", "check", "encourage"],
          description: "Current teaching mode: socratic (asking questions), explain (teaching concept), check (verifying understanding), encourage (building confidence)"
        },
        next_action: {
          type: "string",
          enum: ["ask_student", "wait_for_working", "give_hint", "move_on"],
          description: "What should happen next in the conversation"
        }
      },
      required: ["reply_text", "topic", "difficulty", "mode", "next_action"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, questionContext, userContext } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Chat request with", messages.length, "messages, user context:", userContext);

    // Build context-aware system prompt
    let systemPrompt = buildSystemPrompt(userContext);
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: aiMessages,
        tools: [tutorResponseTool],
        tool_choice: { type: "function", function: { name: "tutor_response" } },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract structured response from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const structuredResponse = JSON.parse(toolCall.function.arguments);
        console.log("Structured response:", structuredResponse);
        
        return new Response(JSON.stringify(structuredResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
        // Fallback to raw text
        const content = data.choices?.[0]?.message?.content || "I'm having trouble responding. Try again?";
        return new Response(JSON.stringify({ 
          reply_text: content,
          topic: "Unknown",
          difficulty: "medium",
          mode: "socratic",
          next_action: "ask_student"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback if no tool call
    const content = data.choices?.[0]?.message?.content || "I'm having trouble responding. Try again?";
    return new Response(JSON.stringify({ 
      reply_text: content,
      topic: "Unknown",
      difficulty: "medium",
      mode: "socratic",
      next_action: "ask_student"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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