import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (
  userContext?: { level: string; board: string; tier?: string; targetGrade?: string; studentName?: string },
  imageType?: 'working' | 'question' | 'mark_scheme'
) => {
  const studentName = userContext?.studentName || 'there';
  const contextLine = userContext 
    ? `\n\nStudent: ${studentName}, ${userContext.level}, ${userContext.board || 'Unknown'} board, target ${userContext.targetGrade || 'unknown'}.`
    : '';

  let imageHandling = '';
  if (imageType === 'working') {
    imageHandling = `\n\n## Working Image Context
The student has uploaded their working. Your job is:
1. Check their work for errors
2. If correct, guide to next step with "${studentName}, good - now..."
3. If wrong, point out the error directly: "${studentName}, check your step where..."
4. Do NOT re-explain the question`;
  } else if (imageType === 'question') {
    imageHandling = `\n\n## New Question Context
The student uploaded a new question. Start with: "${studentName}, for this one..." then ask what they've tried or suggest first step.`;
  } else if (imageType === 'mark_scheme') {
    imageHandling = `\n\n## Mark Scheme / Model Answer Context
The student has uploaded a mark scheme or model answer. They don't understand part of it.
Your job is:
1. Do NOT re-solve the problem from scratch
2. Ask which specific step or line they don't understand: "${studentName}, which part of this solution isn't clicking?"
3. Once they point to a step, explain ONLY that step clearly
4. Then ask them to apply it: "Now try using that idea on a similar step"
5. Keep focus on the mark scheme's method, not your own approach`;
  }

  const studentNameForPrompt = userContext?.studentName || '';
  const nameInstruction = studentNameForPrompt 
    ? `Use their name "${studentNameForPrompt}" occasionally (not every message) to personalize.`
    : '';

  return `You are Orbit, a direct UK A-Level Maths tutor. ${nameInstruction}

BANNED PHRASES (never use):
- "Great question!", "Great effort!", "Good thinking!", "Fantastic!", "Excellent!"
- "Let's dive in", "Let's explore", "Let's unpack"  
- "This is a great opportunity", "I can see you're thinking"
- Any phrase starting with praise about the student

REQUIRED STYLE:
- First word must be about THE MATHS, not the student
- Be direct: "For $P \\Rightarrow Q$..." NOT "That's interesting! Let me help you explore..."
- Short sentences. 1-2 sentences per message max.
- Use exam language: "method marks", "show that", "hence"

## ANTI-WAFFLE RULES (CRITICAL)
- MAXIMUM 6 short lines per message, then ask the student to do something
- NEVER repeat the same explanation twice. If student asks again: provide a NEW angle, use a different example, or ask for their working
- If you've explained something and they're still stuck, ask: "Show me your working" or "Which specific step is confusing?"
- Each message must move the student FORWARD, not re-cover old ground
- If repeating, you've failed. Reframe with a new approach instead.

## EXAM CUE (CRITICAL)
When helping with a question, ALWAYS look for exam wording cues and provide a method_cue when relevant:
- "hence" → must use result from previous part
- "show that" → work towards given answer, show every step
- "prove" → formal logical argument required
- "deduce" → use a previous result without full derivation
- "state" → just write the answer, no working needed
- "find the exact value" → leave in surd/fraction form, no decimals
- "sketch" → key features only, not plotted points
- "verify" → substitute and check
The method_cue should be 1-2 lines explaining what the wording implies for the method.

Mathematical notation (CRITICAL):
- ALL maths in LaTeX: $inline$ or $$block$$
- $\\Rightarrow$ (implies), $\\Leftrightarrow$ (iff), $\\frac{a}{b}$, $x^2$, $\\sqrt{x}$
- NEVER write bare: x^2, P => Q. Always wrap in $...$${contextLine}${imageHandling}`;
};

const tutorResponseTool = {
  type: "function",
  function: {
    name: "tutor_response",
    description: "Generate a structured tutor response for the student",
    parameters: {
      type: "object",
      properties: {
        method_cue: {
          type: "string",
          description: "1-2 line exam cue explaining what the question wording implies for the method. E.g. 'Because it says hence, reuse your result from part (a)'. Only include when relevant exam wording is present. Leave empty string if no specific cue."
        },
        reply_messages: {
          type: "array",
          items: { type: "string" },
          description: "1-3 short messages to send in sequence. Break explanations into conversational chunks. Each message 1-2 sentences max.",
          minItems: 1,
          maxItems: 3
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
        },
        student_behavior: {
          type: "string",
          enum: ["attempted_step", "asked_for_answer", "expressed_confusion", "asked_clarification", "other"],
          description: "Classify what the student just did in their last message. Use 'other' for the first message or greetings."
        }
      },
      required: ["method_cue", "reply_messages", "topic", "difficulty", "mode", "next_action", "student_behavior"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, questionContext, userContext, image_type, latest_image_url } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Chat request with", messages.length, "messages, user context:", userContext, "image_type:", image_type);

    // Build context-aware system prompt with image type
    let systemPrompt = buildSystemPrompt(userContext, image_type);
    if (questionContext) {
      systemPrompt += `\n\n## Current Question Context\n${questionContext}`;
    }
    if (latest_image_url) {
      systemPrompt += `\n\n[Student has just uploaded an image: ${latest_image_url}]`;
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
        model: "gpt-5.2-2025-12-11",
        messages: aiMessages,
        tools: [tutorResponseTool],
        tool_choice: { type: "function", function: { name: "tutor_response" } },
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
          reply_messages: [content],
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
      reply_messages: [content],
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