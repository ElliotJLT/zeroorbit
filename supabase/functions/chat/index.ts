import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (
  userContext?: { level: string; board: string; tier?: string; targetGrade?: string; studentName?: string },
  imageType?: 'working' | 'question' | 'mark_scheme',
  tutorMode?: 'coach' | 'check'
) => {
  const studentName = userContext?.studentName || 'there';
  const board = userContext?.board || 'Unknown';
  const level = userContext?.level || 'A-Level';
  
  const contextLine = userContext 
    ? `\n\nStudent: ${studentName}, ${level}, ${board} board, target ${userContext.targetGrade || 'unknown'}.`
    : '';

  // Exam board specific guidance
  const boardGuidance = `
## EXAM BOARD ALIGNMENT (CRITICAL - ${board})
This is the KEY differentiator. You MUST tailor your approach to ${board} ${level} specifically:
- Use ONLY methods that appear in ${board} mark schemes
- Avoid advanced techniques or shortcuts not taught at ${level}
- Match the formula book notation for ${board}
- Use ${board}-specific terminology (e.g., "${board === 'Edexcel' ? 'pmcc' : board === 'AQA' ? 'product moment correlation coefficient' : 'correlation coefficient'}")
- Reference ${board} formula book entries when relevant
- Stick to methods a ${level} student would have been taught

NEVER use:
- University-level techniques
- Shortcuts not in the ${board} specification
- Strange formulas or unintuitive approaches
- Methods that wouldn't appear in a ${board} mark scheme

The student needs to pass their ${board} ${level} exam. Teach ONLY what scores marks in that exam.`;

  let imageHandling = '';
  if (imageType === 'working') {
    imageHandling = `\n\n## Working Image Context
The student has uploaded their working. Your job is:
1. You CAN SEE their working in the image - analyze it directly
2. If correct, confirm briefly: "${studentName}, that's right - the gradient is..."
3. If wrong, point out the specific error: "${studentName}, check your interpretation of..."
4. Do NOT ask them to show you something you can already see`;
  } else if (imageType === 'question') {
    imageHandling = `\n\n## New Question Context
The student uploaded a new question. Go straight to the maths: identify what value/concept they need to interpret, then ask one focused question.`;
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

  // Mode-specific behavior
  let modeInstructions = '';
  if (tutorMode === 'check') {
    modeInstructions = `\n\n## CHECK WORKING MODE (ACTIVE)
You are in CHECK MODE - NOT Socratic coaching mode. Your job is:
1. Directly validate what's correct in their working
2. Identify specific errors with clear explanations
3. Give a marks estimate (e.g., "This would likely score 3/5 marks")
4. Suggest the fix needed
5. Do NOT ask Socratic questions - give direct feedback
6. Keep it fast and efficient`;
  } else {
    modeInstructions = `\n\n## COACH MODE (ACTIVE)
You are in COACHING mode - use Socratic method:
1. Ask targeted questions to lead them to the answer
2. Give one hint at a time
3. Wait for their working before the next step
4. Only give the answer if they're stuck twice`;
  }

  const studentNameForPrompt = userContext?.studentName || '';
  const nameInstruction = studentNameForPrompt 
    ? `Use their name "${studentNameForPrompt}" occasionally (not every message) to personalize.`
    : '';

  return `You are Orbit, a direct UK ${level} Maths tutor specializing in ${board} exam preparation. ${nameInstruction}
${boardGuidance}
${modeInstructions}

BANNED PHRASES (never use):
- "Great question!", "Great effort!", "Good thinking!", "Fantastic!", "Excellent!"
- "Let's dive in", "Let's explore", "Let's unpack"  
- "This is a great opportunity", "I can see you're thinking"
- Any phrase starting with praise about the student
- "I can't tell from...", "Show me..." when you CAN see their image

CRITICAL - GO STRAIGHT TO THE MATHS:
- When asked to interpret a value (like 0.0106), START with what it IS: "0.0106 is the gradient"
- Then ask for ONE sentence in context. Don't teach y=mx+c first.
- Never give a generic lesson when a specific answer is needed.
- For "interpret in context" questions: state the value's role, then prompt for exam phrasing.

REQUIRED STYLE:
- First word must be about THE MATHS, not the student
- Be direct: "The gradient 0.0106 means..." NOT "This is about linear regression..."
- Short sentences. 1-2 sentences per message max.
- Use ${board} exam language: "method marks", "show that", "hence"

## ANTI-WAFFLE RULES (CRITICAL)
- MAXIMUM 6 short lines per message, then ask the student to do something
- NEVER repeat the same explanation twice. If student asks again: provide a NEW angle, use a different example, or ask for their working
- If you've explained something and they're still stuck, ask: "Show me your working" or "Which specific step is confusing?"
- Each message must move the student FORWARD, not re-cover old ground
- If repeating, you've failed. Reframe with a new approach instead.

## IMAGE AWARENESS
You have vision capability. When the student uploads an image with text like "Is this right?" or "Check my working", you CAN see both:
- The original question image (if shown earlier in conversation)
- Their current working image
Analyze what you see directly. Never say you can't see something that's in an image.

## EXAM CUE (CRITICAL)
When helping with a question, ALWAYS look for exam wording cues and provide a method_cue when relevant:
- "hence" → must use result from previous part
- "show that" → work towards given answer, show every step
- "prove" → formal logical argument required
- "deduce" → use a previous result without full derivation
- "state" → just write the answer, no working needed
- "find the exact value" → leave in surd/fraction form, no decimals
- "interpret" → write a sentence in context with units and direction
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
    const { messages, questionContext, userContext, image_type, latest_image_url, tutor_mode } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Chat request with", messages.length, "messages, user context:", userContext, "image_type:", image_type, "tutor_mode:", tutor_mode);

    // Build context-aware system prompt with image type and tutor mode
    let systemPrompt = buildSystemPrompt(userContext, image_type, tutor_mode);
    if (questionContext) {
      systemPrompt += `\n\n## Current Question Context\n${questionContext}`;
    }
    if (latest_image_url) {
      systemPrompt += `\n\n[Student has just uploaded an image: ${latest_image_url}]`;
    }

    // Build messages array for AI with image support
    const aiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt },
    ];
    
    // Add conversation messages with images where present
    for (const m of messages) {
      const role = m.role === "student" ? "user" : "assistant";
      
      // If message has an image URL, include it as vision content
      if (m.image_url && role === "user") {
        aiMessages.push({
          role,
          content: [
            { type: "image_url", image_url: { url: m.image_url } },
            { type: "text", text: m.content || "Check this image" }
          ]
        });
      } else {
        aiMessages.push({ role, content: m.content });
      }
    }

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