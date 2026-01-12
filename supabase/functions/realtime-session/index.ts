import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildTutorPrompt = (userContext?: { 
  level?: string; 
  board?: string; 
  currentGrade?: string; 
  targetGrade?: string;
  struggles?: string;
}, questionContext?: string) => {
  const contextLine = userContext 
    ? `\n\nStudent: ${userContext.level || 'A-Level'}, board ${userContext.board || 'Unknown'}, current grade ${userContext.currentGrade || 'unknown'}, target ${userContext.targetGrade || 'unknown'}.${userContext.struggles ? ` Struggles with: ${userContext.struggles}.` : ''}`
    : '';

  const questionLine = questionContext 
    ? `\n\n## Current Question\n${questionContext}`
    : '';

  return `You are Orbit, a friendly UK A-Level Maths tutor having a real-time voice conversation with a student. Your job is to help them learn and perform in exams.

Voice conversation style:
- Be warm, encouraging, and conversational - you're chatting naturally, not lecturing.
- Keep responses SHORT - 2-3 sentences max. This is a back-and-forth conversation.
- Use natural pauses and acknowledge what the student says.
- Say "hmm", "right", "okay" naturally when thinking.
- If the student is confused, stay calm and try a different approach.

Teaching approach:
- Default to Socratic method: guide step-by-step, ask ONE question at a time.
- Never give away answers immediately - help them discover it.
- Use exam-style language when helpful ("method marks", "show that", etc.).
- If they ask for the answer directly, gently redirect unless they've already tried.

Important rules:
- NEVER start with praise like "Great question!" - get straight to helping.
- If you're unsure about part of the question, ask for clarification.
- Be strict about algebra and units.
- Keep responses concise for natural conversation flow.${contextLine}${questionLine}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userContext, questionContext, questionSummary } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Creating realtime session with context:", { userContext, questionSummary });

    // Build the tutor system prompt
    const instructions = buildTutorPrompt(userContext, questionContext || questionSummary);

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer", // Warm, friendly voice for tutoring
        instructions,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 2500, // Give students time to think before responding
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Realtime API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Realtime session created successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating realtime session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
