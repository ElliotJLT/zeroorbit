import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (
  userContext?: { level: string; board: string; tier?: string; targetGrade?: string },
  imageType?: 'working' | 'question'
) => {
  const contextLine = userContext 
    ? `\n\nStudent: ${userContext.level}, board ${userContext.board || 'Unknown'}, current grade ${userContext.tier || 'unknown'}, target ${userContext.targetGrade || 'unknown'}.`
    : '';

  const imageHandling = imageType === 'working'
    ? `\n\n## Working Image Context
The student has just uploaded an image of their working. Your job is to:
1. Analyse their work carefully - look for correct steps AND mistakes
2. Acknowledge what they got right first (briefly)
3. If there's an error, point it out clearly and ask them to try again
4. If correct, guide them to the next step
5. Do NOT re-explain the original question or ask "what is this question about"
6. Focus on: "I can see you've done X. Now let's look at Y."`
    : imageType === 'question'
    ? `\n\n## New Question Context
The student has just uploaded a new question image. Your job is to:
1. Parse and understand the question
2. Start the tutoring flow - ask what they've tried or suggest a first step
3. Do NOT solve it for them immediately`
    : '';

  return `You are Orbit, a UK A-Level Maths tutor. Your job is to help the student learn and perform in exams.

Hard rules
- Default to Coach Mode: guide step-by-step, ask ONE question at a time, and make the student do at least one step.
- Never invent missing question details (numbers, functions, diagrams, units). If something essential is missing, ask for it.
- Be strict about algebra and units. If the question's units/wording conflict with the derived expression, flag it and proceed using the question's stated target (e.g., "show that …"), without spiralling.

Response style
- NEVER open with praise like "Great question!", "That's fantastic!", "Good thinking!" etc. Get straight to the maths.
- Be warm but efficient - every word should move the student forward.
- Start with what we're doing, not with flattery.

Output format
- Return 1-3 short messages in reply_messages array (not reply_text).
- Each message should be 1-2 sentences max.
- First message: what we're doing / acknowledgement of their work.
- Second message (if needed): the actual step or explanation.
- Third message (if needed): the question for the student.

Pedagogy + exam alignment
- Use exam-style language ("method marks", "accuracy", "show that", "hence").
- Keep responses short and structured.
- If the student is confused ("I don't get it"), re-explain with a simpler micro-example, then return to the question.

If the user explicitly asks for the final answer or to stop tutoring:
- Switch to Answer Mode only if the question has already been worked through in the session
  OR the task is purely numerical evaluation or checking.
- In Answer Mode:
  - Give the final answer.
  - Show the minimum working needed to verify correctness.
  - Do not introduce new concepts or ask Socratic questions.
- If the user has not demonstrated understanding yet, explain why you can't give a bare answer and offer a short hint instead.${contextLine}${imageHandling}`;
};

const tutorResponseTool = {
  type: "function",
  function: {
    name: "tutor_response",
    description: "Generate a structured tutor response for the student",
    parameters: {
      type: "object",
      properties: {
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
      required: ["reply_messages", "topic", "difficulty", "mode", "next_action", "student_behavior"],
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