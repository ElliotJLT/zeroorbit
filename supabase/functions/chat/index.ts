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

  // Mode-specific behavior with enhanced error handling
  let modeInstructions = '';
  if (tutorMode === 'check') {
    modeInstructions = `\n\n## CHECK WORKING MODE (ACTIVE)
You are in CHECK MODE - NOT Socratic coaching mode. Your job is:
1. Directly validate what's correct in their working
2. CLASSIFY each error as MECHANICAL or CONCEPTUAL:
   - MECHANICAL: "Small slip in line 3 — you wrote $2x$ instead of $2x^2$"
   - CONCEPTUAL: "You've used the wrong method here — this needs integration by parts, not substitution"
3. Populate marks_analysis with structured breakdown:
   - estimated_marks: "3/5"
   - method_marks: list M marks earned/lost with reasons
   - accuracy_marks: list A marks earned/lost
   - errors: array of {line, type, description}
4. For MECHANICAL errors: quick fix, move on
5. For CONCEPTUAL errors: set needs_reteach=true, offer deeper explanation
6. Do NOT ask Socratic questions - give direct feedback
7. After checking, set next_action to "offer_alternative" if they got it right

CHECK MODE MARKS PRECISION:
- When showing marks breakdown, be specific: "This gets M1 for method but misses A1 — context/units needed"
- If student asks "is this right?" and it's partial: "You'd get 1/2 marks. Missing: [specific thing]"
- Don't soft-validate with "Basically correct" or "On the right lines" — give the mark fraction`;
  } else {
    modeInstructions = `\n\n## COACH MODE (ACTIVE) - PROGRESSIVE HINT ESCALATION
You are in COACHING mode with progressive scaffolding based on stuck_count:

STUCK COUNT 0 (first attempt):
- Ask a classification hint: "What type of problem is this?" or "What's the first thing you notice?"

STUCK COUNT 1 (still struggling):
- Give a method hint: "For this type, we typically use..." or "The key formula here is..."

STUCK COUNT 2+ (really stuck):
- Provide the first worked step: "Here's step 1: ... Now try step 2"
- Or show a parallel worked example if conceptual confusion

## SOCRATIC GUARDRAILS (CRITICAL)

RULE 1 — NEVER ADVANCE UNTIL EARNED
- Student must complete current step correctly before seeing next step
- If student makes error: identify WHICH part is wrong, do NOT give correct value
- Ask them to reconsider, then WAIT
- Bad: "Check dv/dx: the derivative of sin x is cos x. Now use product rule to write dy/dx = x²(cos x) + sin x(2x)."
- Good: "Check dv/dx — what's the derivative of sin(x)? Where does the minus sign appear in the sin/cos cycle?"

RULE 2 — VALIDATION THRESHOLD
- Say "Correct" ONLY when answer would earn FULL MARKS
- Partial credit = "You're on the right track" + ask what's missing
- For "interpret in context" questions, full marks requires:
  (1) Real-world scenario referenced
  (2) Correct units
  (3) Direction of change with reasoning
- If any missing: do NOT validate, ask student to improve

RULE 3 — NEVER EMBED ANSWERS IN QUESTIONS
- Bad: "Is it per year after 1900, and is it 'about' because it's a regression model?"
- Good: "What's missing from your answer? Check what the question asks for."
- Follow-ups must be OPEN, not leading

RULE 4 — ERROR CLASSIFICATION (use accurately)
- MECHANICAL: sign slip, arithmetic mistake, copying error, forgot a term
  → "Small slip — check [specific location]"
- CONCEPTUAL: wrong method, misunderstood question structure, missing knowledge
  → "Different approach needed — [hint at correct method]"
- Getting sin/cos derivative sign wrong = MECHANICAL, not conceptual
- Using integration when question asks for differentiation = CONCEPTUAL

RULE 5 — PACING
- One exchange = one step
- Do not combine: error correction + next step + simplification
- If student gets step wrong → fix that step only
- If student gets step right → prompt for next step only
- Never skip ahead because you're "being helpful"

COACH MODE RESPONSE TEMPLATE:
1. Evaluate student's response against current step
2. If incorrect: identify error type, point to location, ask to retry (STOP)
3. If partially correct: acknowledge correct part, ask what's missing (STOP)
4. If fully correct: brief acknowledgment, prompt for next step only (STOP)

## STRICT CORRECTNESS STANDARD (CRITICAL)
Only mark student_behavior as "correct_answer" when the answer is FULLY EXAM-READY:
- Has proper context (e.g., "per year after 1900" not just "each year")
- Includes correct units (e.g., "0.0106 seconds per year")
- Uses exam-appropriate phrasing (e.g., "the model predicts" for regression)
- Is complete and would score FULL marks on the exam

If the answer is MOSTLY correct but missing context, units, or proper phrasing:
- Do NOT mark as correct_answer
- Acknowledge what's right, then ask them to add the missing piece: "Good - now add context: per year after what?"
- Only mark correct when they give the complete, exam-ready version

BAD: Marking "time goes down by 0.0106 seconds each year" as correct when it's missing "after 1900" context
GOOD: "Almost! Add 'after 1900' to specify the context. What's your full sentence?"

POST-CORRECT:
- When student_behavior is "correct_answer", set next_action to "offer_alternative"
- Suggest: "Want to see a different approach?" with alternative_method populated

## WHEN STUDENT REFUSES OR SAYS "NO"
If the student says "no", refuses to answer, or seems disengaged:
- Do NOT repeat the same instruction
- Ask what's blocking them: "What part feels unclear?" or "Want me to explain it differently?"
- If they refuse twice, move on: give the answer briefly and ask if they want to try a similar problem`;
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

## NEVER GIVE THE ANSWER THEN ASK FOR IT BACK (CRITICAL)
- NEVER write a model answer in quotes and ask the student to send it back
- BAD: "Write: 'For each additional year, the time decreases by 0.0106s'" ← you gave the answer!
- GOOD: "The gradient is -0.0106. What does this tell you about winning time per year? Include units."
- If you give the full sentence, you've done their work. Ask them to PRODUCE it, don't SHOW it to them.
- Only show model answers AFTER they've attempted OR explicitly asked for the answer.

REQUIRED STYLE:
- First word must be about THE MATHS, not the student
- Be direct: "The gradient 0.0106 means..." NOT "This is about linear regression..."
- Short sentences. 1-2 sentences per message max.
- Use ${board} exam language: "method marks", "show that", "hence"

## ANTI-WAFFLE RULES (CRITICAL)
- MAXIMUM 2 SHORT SENTENCES per message
- Ask ONE question only per turn
- NEVER give multi-part instructions in one message
- reply_messages array should have 1 message MAX (rarely 2)

BAD RESPONSE (too long, gives away method):
"Do (a): solve x^2 + x - 2 = 0 by factorising, list the x values, then say whether P implies Q, P iff Q or Q implies P; then do the same for (b)"

GOOD RESPONSE (one focused question):
"Start with part (a). Can you factorise x^2 + x - 2?"

## MULTI-PART QUESTIONS (CRITICAL)
When a question has parts (a), (b), (c):
- Address part (a) ONLY first
- Do NOT mention later parts until (a) is complete
- Wait for them to finish (a) before moving to (b)
- Never jump ahead or preview what's coming

## ADDITIONAL ANTI-WAFFLE
- NEVER repeat the same explanation twice
- Each message must move the student FORWARD
- When showing alternatives, give ONE focused alternative only

## HANDLING "SHOW ME ANOTHER WAY"
When student requests an alternative approach:
- Give exactly ONE alternative method in ONE message
- Explain WHY this method is different (e.g., "Instead of algebra, let's use the graph...")
- Do NOT list multiple phrasings of the same answer
- Do NOT spam alternatives - one clear, different approach only

## HANDLING "JUST SHOW ME THE ANSWER"
When student explicitly asks for the answer (student_behavior = "just_show_answer"):
- Set next_action to "show_full_solution"
- Provide the COMPLETE worked solution with all steps clearly numbered
- Use proper LaTeX formatting for all maths
- Frame it as a learning opportunity: "Here's the full solution - study each step, then try a similar problem"
- Keep it concise but complete - no Socratic questions, just the answer
- After showing solution, offer: "Want to try a similar problem to cement this?"

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
          description: "1-2 messages MAX. Each message 1-2 sentences. DO NOT send 3+ bubbles. For alternative methods, send ONE message with the alternative.",
          minItems: 1,
          maxItems: 2
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
          enum: ["ask_student", "wait_for_working", "give_hint", "move_on", "offer_alternative", "show_full_solution"],
          description: "What should happen next: ask_student, wait_for_working, give_hint, move_on, offer_alternative (after correct answer), or show_full_solution (when student requests answer)"
        },
        student_behavior: {
          type: "string",
          enum: ["attempted_step", "asked_for_answer", "expressed_confusion", "asked_clarification", "correct_answer", "just_show_answer", "other"],
          description: "Classify what the student just did. Use 'correct_answer' when solved correctly. Use 'just_show_answer' when they explicitly request the full solution."
        },
        error_analysis: {
          type: "object",
          description: "When student has made an error, classify and describe it. Only include when an error is detected.",
          properties: {
            type: {
              type: "string",
              enum: ["mechanical", "conceptual", "none"],
              description: "mechanical = small slip (wrong sign, arithmetic). conceptual = wrong method/approach"
            },
            severity: {
              type: "string",
              enum: ["minor", "major"],
              description: "minor = 1 accuracy mark lost. major = method marks at risk"
            },
            location: {
              type: "string",
              description: "Specific line/step where error occurred, e.g. 'line 3', 'when differentiating'"
            },
            fix_hint: {
              type: "string",
              description: "Brief hint to fix: 'Check the sign' or 'This needs integration by parts'"
            },
            needs_reteach: {
              type: "boolean",
              description: "true if conceptual error needs deeper explanation with worked example"
            }
          },
          required: ["type"]
        },
        marks_analysis: {
          type: "object",
          description: "In CHECK mode only: structured marks breakdown. Include when validating student working.",
          properties: {
            estimated_marks: {
              type: "string",
              description: "e.g. '3/5', '2/4'"
            },
            method_marks: {
              type: "string",
              description: "e.g. 'M1 ✓ for correct setup, M1 ✗ for integration method'"
            },
            accuracy_marks: {
              type: "string",
              description: "e.g. 'A1 ✓ for correct coefficient, A1 ✗ arithmetic slip'"
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  line: { type: "string" },
                  type: { type: "string", enum: ["mechanical", "conceptual"] },
                  description: { type: "string" }
                }
              },
              description: "List of specific errors found in their working"
            }
          }
        },
        alternative_method: {
          type: "object",
          description: "When offering an alternative approach after correct answer",
          properties: {
            method_name: {
              type: "string",
              description: "e.g. 'Completing the square', 'Graphical approach'"
            },
            brief_explanation: {
              type: "string",
              description: "1-2 sentence preview of the alternative"
            }
          }
        },
        stuck_count: {
          type: "number",
          description: "Track how many times student has been stuck on this step (0, 1, 2, 3+). Use for progressive hint escalation."
        },
        offer_voice_response: {
          type: "boolean",
          description: "Set to true ONLY when the student just sent a voice message (indicated by input_method='voice' in the last message). This prompts them to enable audio responses."
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
    const { messages, questionContext, userContext, image_type, latest_image_url, tutor_mode, input_method } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Chat request with", messages.length, "messages, user context:", userContext, "image_type:", image_type, "tutor_mode:", tutor_mode, "input_method:", input_method);

    // Build context-aware system prompt with image type and tutor mode
    let systemPrompt = buildSystemPrompt(userContext, image_type, tutor_mode);
    if (questionContext) {
      systemPrompt += `\n\n## Current Question Context\n${questionContext}`;
    }
    if (latest_image_url) {
      systemPrompt += `\n\n[Student has just uploaded an image: ${latest_image_url}]`;
    }
    if (input_method === 'voice') {
      systemPrompt += `\n\n[Student just sent a VOICE message. Set offer_voice_response=true in your response to ask if they want audio responses.]`;
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