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
    const { imageBase64, questionText, ocrOnly } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // OCR-only mode - just extract text from the image
    if (ocrOnly && imageBase64) {
      console.log("Running OCR on question image...");
      
      const ocrMessages = [
        {
          role: "system",
          content: `You are an OCR specialist. Extract all visible text from the maths question image. 
Include mathematical expressions, numbers, and any written text. 
Format mathematical expressions clearly (e.g., x² instead of x2, fractions as a/b).
Return ONLY the extracted text, nothing else. If there's LaTeX or mathematical notation, render it in plain readable form.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text and mathematical expressions from this image:"
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ];

      const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: ocrMessages,
        }),
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error("OCR error:", ocrResponse.status, errorText);
        return new Response(JSON.stringify({ detectedText: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ocrData = await ocrResponse.json();
      const detectedText = ocrData.choices?.[0]?.message?.content?.trim() || null;
      
      console.log("OCR result:", detectedText);

      return new Response(JSON.stringify({ detectedText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full analysis mode
    console.log("Analyzing question image...");

    const messages = [
      {
        role: "system",
        content: `You are an A-Level maths tutor analyzing a student's uploaded question image.

STEP 1 - VALIDATION:
Check if this image contains maths. If NOT (photos, memes, random images), respond:
{"isMaths": false, "rejectionReason": "What the image actually shows"}

STEP 2 - IF IT IS MATHS:
Analyze and respond with JSON. Your "socraticOpening" MUST follow these STRICT rules:

DIRECT TUTORING RULES:
1. Go STRAIGHT to the specific maths - identify the exact value/concept/expression they need
2. For "interpret X in context" questions: Start with "X is the [gradient/intercept/etc]"
3. Ask for ONE thing only - a single sentence, calculation, or identification
4. Maximum 2 sentences total
5. Use exam-style language ("write a sentence with units", "state the meaning")

BANNED PHRASES (never use):
- "Do you remember..."
- "Let's think about..."
- "What do you recall about..."
- "y = mx + c" (unless directly relevant to what they must DO)
- Any generic lesson or recap

EXAM CUE DETECTION:
Look for keywords: "interpret", "hence", "show that", "verify", "explain", "justify", "state"
If found, your methodCue should explain the implied method.

OPENING MESSAGE RULES:
- Identify the question type/method needed
- Ask student to name or select the approach
- Do NOT set up the problem for them
- Do NOT assign variables (u, v, etc.) — let them do it

Bad opening: "This is product rule. Take u = x², v = sin x — what are du/dx and dv/dx?"
Good opening: "This involves the product of two functions. Which rule applies, and how would you set it up?"

EXAMPLES:
Question: "Interpret 0.0106 in context"
BAD: "Do you remember what each part of y = mx + c represents?"
GOOD: "0.0106 is the gradient. Write me one sentence: what happens to winning time for each extra year?"

Question: "Show that x = 3"
BAD: "Let's think about how to approach this..."
GOOD: "Because it says 'show that', you need to work towards x = 3 from the equation. Start by expanding."

Question: "Differentiate x² sin x"
BAD: "This is product rule. Take u = x², v = sin x — what are du/dx and dv/dx?"
GOOD: "This involves the product of two functions. Which rule applies, and how would you set it up?"

Response format:
{
  "isMaths": true,
  "questionSummary": "Brief description",
  "topic": "Statistics > Regression" or similar,
  "difficulty": "GCSE/A-Level/University",
  "methodCue": "Short exam tip based on keywords (e.g., 'interpret in context = write a sentence with units and direction')",
  "socraticOpening": "Your DIRECT opening. State what they're looking at, ask for ONE specific thing."
}`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: questionText 
              ? `The student uploaded this image and added: "${questionText}". First determine if it's a maths question, then analyze if it is. Respond with JSON.`
              : "The student uploaded this image. First determine if it's a maths question, then analyze if it is. Respond with JSON."
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
      analysis = {
        isMaths: true,
        questionSummary: "A maths question",
        topic: "Mathematics",
        difficulty: "A-Level",
        methodCue: null,
        socraticOpening: "I can see your question. What's the first value or expression you need to identify here?"
      };
    }

    // Check if the image was rejected as non-maths
    if (analysis.isMaths === false) {
      console.log("Image rejected - not a maths question:", analysis.rejectionReason);
      // Return 200 with error in data so Supabase SDK properly populates response.data
      return new Response(JSON.stringify({ 
        error: "not_maths",
        rejectionReason: analysis.rejectionReason || "This doesn't appear to be a maths question"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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