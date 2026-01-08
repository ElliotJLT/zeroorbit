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

    const systemPrompt = `You are an A-Level Maths examiner. Generate ONE practice question for the given topic. Difficulty ${difficulty_tier}/5. Use LaTeX: $inline$ or $$block$$. Keep solutions concise.`;

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
          { role: "user", content: `Generate a question for topic: "${topic_name}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_question",
              description: "Create an A-Level maths practice question",
              parameters: {
                type: "object",
                properties: {
                  question_text: { 
                    type: "string", 
                    description: "The question with LaTeX math notation" 
                  },
                  final_answer: { 
                    type: "string", 
                    description: "The simplified final answer" 
                  },
                  marking_points: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "3-5 key marking points"
                  },
                  worked_solution: { 
                    type: "string", 
                    description: "Brief step-by-step solution (max 100 words)" 
                  }
                },
                required: ["question_text", "final_answer", "marking_points", "worked_solution"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_question" } }
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
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_question") {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("AI did not return structured output");
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      throw new Error("Invalid tool call arguments");
    }

    // Validate required fields
    if (!parsed.question_text || !parsed.final_answer || !parsed.marking_points || !parsed.worked_solution) {
      console.error("Missing fields in parsed:", parsed);
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
