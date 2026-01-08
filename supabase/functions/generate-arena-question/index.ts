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

    const systemPrompt = `You are an A-Level Maths examiner. Generate ONE practice question.

RULES:
- Difficulty ${difficulty_tier}/5
- Use LaTeX: $inline$ or $$block$$
- Keep solutions SHORT (max 150 words)
- Output ONLY valid JSON, no explanations

JSON format:
{"question_text":"...","final_answer":"...","marking_points":["..."],"worked_solution":"..."}`;

    const userPrompt = `Topic: "${topic_name}". Generate one question now.`;

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

    // Parse the JSON response (handle potential markdown code blocks and multiple JSON objects)
    let parsed;
    try {
      // Remove markdown code blocks
      let cleanedContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      
      // If there are multiple JSON objects, take the last complete one (often the corrected version)
      const jsonMatches = cleanedContent.match(/\{[\s\S]*?\}(?=\s*\{|\s*$)/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try each match from last to first until we find valid JSON
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            const candidate = JSON.parse(jsonMatches[i]);
            if (candidate.question_text && candidate.final_answer) {
              parsed = candidate;
              break;
            }
          } catch {
            continue;
          }
        }
      }
      
      // Fallback: try parsing the whole thing
      if (!parsed) {
        parsed = JSON.parse(cleanedContent);
      }
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
