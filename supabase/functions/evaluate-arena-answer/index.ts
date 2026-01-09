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
    const { 
      question_text, 
      final_answer, 
      marking_points,
      student_answer,
      student_image_url,
      attempt_number = 1
    } = await req.json();
    
    if (!question_text || !final_answer) {
      throw new Error("question_text and final_answer are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an A-Level Maths examiner providing micro-feedback on student work.

CRITICAL RULES:
1. Keep feedback to MAX 2 sentences
2. No praise or preamble - get straight to the point
3. Never demand LaTeX from students
4. If work is unclear from image, ask for the specific missing step
5. Be encouraging but direct

ADAPTIVE COACHING based on attempt #${attempt_number}:
- Attempt 1: Just evaluate. If wrong, hint at where to look.
- Attempt 2: Give a more specific hint about the method.
- Attempt 3: Give a strong nudge - almost telling them the approach.
- Attempt 4+: Offer to show the solution ("Would you like to see the worked solution?")
- If correct at any point: next_action = "complete"

ERROR CLASSIFICATION IN FEEDBACK:
- If MECHANICAL error (sign slip, arithmetic, copying): "Small slip in [location]" — don't reveal fix
- If CONCEPTUAL error (wrong method, misunderstood structure): "Check your method — this question needs [hint]"
- Match feedback specificity to attempt number:
  - Attempt 1: Point to area ("check your sign")
  - Attempt 2: Point to specific step ("line 2, the derivative")
  - Attempt 3: Name the issue ("sin differentiates to cos, not -cos")
  - Attempt 4+: Show solution

You MUST respond with valid JSON only, no markdown code blocks.`;

    const studentWork = student_image_url 
      ? `[Student submitted working image]` 
      : `Student's answer: ${student_answer || "(no answer provided)"}`;

    const userPrompt = `QUESTION: ${question_text}

CORRECT FINAL ANSWER: ${final_answer}

MARKING POINTS: ${marking_points?.join(", ") || "Standard marks"}

ATTEMPT NUMBER: ${attempt_number}

STUDENT SUBMISSION:
${studentWork}

Evaluate and return this exact JSON:
{
  "status": "correct" | "partial" | "incorrect",
  "marks_estimate": "X/Y (e.g., 2/5)",
  "feedback_summary": "1-2 sentence feedback - adapt depth based on attempt number",
  "next_action": "ask_for_working" | "ask_for_final_answer" | "give_next_step_hint" | "show_model_solution" | "complete",
  "next_prompt": "What to say to student next (if not complete)"
}`;

    // Build messages array - if there's an image, use multimodal
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (student_image_url) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: student_image_url } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
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

    // Parse the JSON response
    let parsed;
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      // Return a fallback response
      parsed = {
        status: "partial",
        marks_estimate: "?/5",
        feedback_summary: "I couldn't fully analyze your work. Could you try writing it more clearly?",
        next_action: "ask_for_working",
        next_prompt: "Try showing your working step by step.",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in evaluate-arena-answer:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
