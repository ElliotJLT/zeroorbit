import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, questionText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing question image...");

    const messages = [
      {
        role: "system",
        content: `You are an expert maths tutor analyzing a student's question. Your task is to:
1. Identify what the question is asking
2. Classify the topic (e.g., Algebra, Calculus, Geometry, Statistics, etc.)
3. Assess the difficulty level (GCSE, A-Level, or University)
4. Generate a warm, encouraging Socratic opening that guides the student without giving the answer

Return your response as JSON with this structure:
{
  "questionSummary": "Brief description of what the question is asking",
  "topic": "Main mathematical topic",
  "difficulty": "GCSE/A-Level/University",
  "socraticOpening": "Your warm, guiding opening message that asks a leading question to help them think"
}

Be encouraging and supportive. Never give the answer directly - always guide with questions.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: questionText 
              ? `The student uploaded this maths question and added: "${questionText}". Analyze it and respond with JSON.`
              : "The student uploaded this maths question. Analyze it and respond with JSON."
          },
          ...(imageBase64 ? [{
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }] : [])
        ]
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response:", content);

    // Parse JSON from response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback response
      analysis = {
        questionSummary: "A maths question",
        topic: "Mathematics",
        difficulty: "A-Level",
        socraticOpening: "I can see your question! Let's work through this together. What do you think is the first step we should take to approach this problem?"
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-question:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
