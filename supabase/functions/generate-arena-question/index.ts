import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic_id, topic_name, difficulty_tier = 3 } = await req.json();
    
    if (!topic_id || !topic_name) {
      throw new Error("topic_id and topic_name are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert A-Level Mathematics examiner creating practice questions.

CRITICAL RULES:
1. Create ORIGINAL questions - never copy from past papers
2. Questions must genuinely test the specified topic
3. Difficulty tier ${difficulty_tier}/5 (1=basic recall, 3=standard exam, 5=challenging)
4. Keep wording concise and exam-style
5. Final answers must simplify cleanly
6. Worth 2-8 marks depending on complexity
7. Use LaTeX for all mathematical notation (wrap inline math in $...$ and display math in $$...$$)

You MUST respond with valid JSON only, no markdown code blocks.`;

    const userPrompt = `Generate an A-Level Maths question for the topic: "${topic_name}"
Difficulty tier: ${difficulty_tier}/5

Return this exact JSON structure:
{
  "question_text": "The complete question with LaTeX math notation",
  "final_answer": "The simplified final answer",
  "marking_points": ["Point 1 for marks", "Point 2 for marks", "Point 3 for marks"],
  "worked_solution": "Brief step-by-step solution"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response (handle potential markdown code blocks)
    let parsed;
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    // Validate required fields
    if (!parsed.question_text || !parsed.final_answer || !parsed.marking_points || !parsed.worked_solution) {
      throw new Error("Missing required fields in AI response");
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: question, error: insertError } = await supabase
      .from("arena_questions")
      .insert({
        topic_id,
        difficulty_tier,
        question_text: parsed.question_text,
        final_answer: parsed.final_answer,
        marking_points: parsed.marking_points,
        worked_solution: parsed.worked_solution,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to save question");
    }

    return new Response(JSON.stringify(question), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-arena-question:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
