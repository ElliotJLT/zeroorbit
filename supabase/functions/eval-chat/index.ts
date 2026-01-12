import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestCase {
  name: string;
  setup: string;
  studentInput: string;
  expectedBehavior: string;
  redFlags: string[];
  category?: string;
}

// Comprehensive test suite for Orbit tutor behavior
const testCases: TestCase[] = [
  // SOCRATIC GUARDRAILS - Rule 1: Never advance until earned
  {
    name: "Product rule - sign error (should NOT advance)",
    setup: "Differentiate y = x²sin(x)",
    studentInput: "du/dx = 2x and dv/dx = -cos(x)",
    expectedBehavior: "Identifies sign error on dv/dx, asks student to reconsider, does NOT show correct answer or advance to next step",
    redFlags: ["Correct", "Now use product rule", "dy/dx =", "x²(cos x)", "x²cos(x)"],
    category: "socratic_rule1"
  },
  {
    name: "Chain rule - wrong derivative (should NOT give answer)",
    setup: "Differentiate y = (3x + 1)^5",
    studentInput: "dy/dx = 5(3x + 1)^4",
    expectedBehavior: "Points out missing chain rule factor, asks what else is needed, does NOT show the ×3",
    redFlags: ["×3", "* 3", "times 3", "15(3x + 1)^4", "Correct"],
    category: "socratic_rule1"
  },
  
  // SOCRATIC GUARDRAILS - Rule 2: Validation threshold
  {
    name: "Interpret in context - partial answer (should NOT validate)",
    setup: "Regression line t = 10.878 - 0.0106n. Interpret 0.0106 in context.",
    studentInput: "It means the time goes down by 0.0106 seconds each year",
    expectedBehavior: "Acknowledges direction is right, but asks student to add real-world context and specify 'after 1900'. Does NOT validate as correct.",
    redFlags: ["Correct!", "Well done", "the model predicts", "per year after 1900", "✓"],
    category: "socratic_rule2"
  },
  {
    name: "Missing units in answer (should NOT validate)",
    setup: "A car travels 150km in 2 hours. Calculate the average speed.",
    studentInput: "75",
    expectedBehavior: "Acknowledges the number is right but asks for units. Does NOT mark as correct.",
    redFlags: ["Correct!", "Well done", "That's right", "75 km/h"],
    category: "socratic_rule2"
  },
  
  // SOCRATIC GUARDRAILS - Rule 3: Never embed answers in questions
  {
    name: "Method selection - should NOT set up for them",
    setup: "Find ∫ x√(x+1) dx",
    studentInput: "substitution",
    expectedBehavior: "Confirms substitution is valid, asks student to define their substitution. Does NOT set up u = x+1 for them.",
    redFlags: ["Let u =", "u = x+1", "u = x + 1", "du/dx =", "du ="],
    category: "socratic_rule3"
  },
  {
    name: "Gradient calculation - should NOT reveal answer in hint",
    setup: "Find the gradient of y = 3x² at x = 2",
    studentInput: "I need to differentiate first",
    expectedBehavior: "Confirms differentiation is the right approach, asks them to do it. Does NOT say dy/dx = 6x or show the answer.",
    redFlags: ["dy/dx = 6x", "6x", "gradient is 12", "= 12"],
    category: "socratic_rule3"
  },
  
  // SOCRATIC GUARDRAILS - Rule 4: Error classification
  {
    name: "Sin/cos sign error - should classify as MECHANICAL",
    setup: "Differentiate y = cos(x)",
    studentInput: "dy/dx = sin(x)",
    expectedBehavior: "Identifies this as a mechanical/sign error, asks about the sign. Should NOT treat as conceptual.",
    redFlags: ["conceptual", "different approach", "different method", "wrong method"],
    category: "socratic_rule4"
  },
  {
    name: "Integration vs differentiation - should classify as CONCEPTUAL",
    setup: "Differentiate y = x³",
    studentInput: "I'll integrate, so y = x⁴/4",
    expectedBehavior: "Identifies this as a conceptual error - wrong operation. Should clarify differentiate ≠ integrate.",
    redFlags: ["small slip", "sign error", "check your sign"],
    category: "socratic_rule4"
  },
  
  // SOCRATIC GUARDRAILS - Rule 5: Pacing
  {
    name: "Correct first step - should ONLY prompt next step",
    setup: "Solve 2x + 5 = 13",
    studentInput: "Subtract 5 from both sides: 2x = 8",
    expectedBehavior: "Acknowledges correct step, asks for next step only. Does NOT show x = 4.",
    redFlags: ["x = 4", "divide by 2", "the answer is", "so x equals"],
    category: "socratic_rule5"
  },
  
  // ANTI-WAFFLE: Don't give answer then ask for it back
  {
    name: "Should NOT show model answer then ask for it",
    setup: "Interpret the gradient -0.0106 in the regression t = 10.878 - 0.0106n",
    studentInput: "What does the gradient mean?",
    expectedBehavior: "Asks student to formulate interpretation. Does NOT write a model sentence for them to copy.",
    redFlags: ["Write:", "Your answer should be:", "Say:", "The model predicts"],
    category: "anti_waffle"
  },
  
  // CHECK MODE behavior
  {
    name: "Check mode - should give marks breakdown",
    setup: "Check my working for: Find dy/dx if y = x³. Student working: dy/dx = 3x²",
    studentInput: "Is this right?",
    expectedBehavior: "Confirms correct, should give specific marks (e.g., '2/2 marks' or 'M1 A1'). Does NOT ask Socratic questions.",
    redFlags: ["What do you think?", "Try again", "How did you get that?"],
    category: "check_mode"
  },
  
  // EXAM CUE handling
  {
    name: "Hence - should require using previous result",
    setup: "(a) Show that sin²x + cos²x = 1. (b) Hence simplify sin²x + cos²x + tan²x",
    studentInput: "For part b, I'll start from scratch",
    expectedBehavior: "Explains 'hence' means must use part (a) result. Should NOT allow fresh start.",
    redFlags: ["Good idea", "Let's simplify", "tan²x ="],
    category: "exam_cue"
  }
];

async function callOrbitChat(setup: string, studentInput: string): Promise<{ reply: string; fullResponse: any }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  // Build messages array in the format the chat function expects
  // role: "student" or "tutor" (will be mapped to "user"/"assistant" in chat function)
  const messages = [
    { role: "tutor", content: `Let's work on this question: ${setup}` },
    { role: "student", content: studentInput }
  ];

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages,
      questionContext: setup,
      userContext: { 
        level: "A-Level", 
        board: "Edexcel",
        studentName: "TestStudent"
      },
      tutor_mode: "coach"
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat function error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const reply = data.reply_messages?.join("\n") || data.message || JSON.stringify(data);
  
  return { reply, fullResponse: data };
}

async function evaluateWithClaude(testCase: TestCase, orbitResponse: string, judgeModel: string): Promise<{
  pass: boolean;
  redFlagsFound: string[];
  reason: string;
}> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: judgeModel,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are evaluating an AI maths tutor's response for Socratic teaching quality.

TEST CASE: ${testCase.name}
CATEGORY: ${testCase.category || "general"}
SETUP (the maths question): ${testCase.setup}
STUDENT INPUT: ${testCase.studentInput}
EXPECTED BEHAVIOR: ${testCase.expectedBehavior}
RED FLAGS (phrases that should NOT appear): ${testCase.redFlags.join(", ")}

ACTUAL RESPONSE FROM TUTOR:
"${orbitResponse}"

EVALUATE:
1. Check for red flags - these are phrases that indicate the tutor broke the rules. Quote any you find.
2. Did the response match expected behavior? Be strict - partial compliance is a FAIL.
3. Key question: Did the tutor advance too quickly, give away the answer, or validate incorrectly?

Respond ONLY with valid JSON (no markdown):
{"pass": boolean, "redFlagsFound": ["quoted phrases found"], "reason": "one sentence explaining verdict"}`
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON found in response");
  } catch (e) {
    console.error("Failed to parse Claude response:", text);
    return {
      pass: false,
      redFlagsFound: [],
      reason: `Evaluation parse error: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { runSubset, specificTests, testLimit, judgeModel } = await req.json().catch(() => ({}));
    const selectedJudgeModel = judgeModel || "claude-opus-4-5-20251101";
    
    // Filter tests if specific ones requested
    let testsToRun = testCases;
    if (specificTests && Array.isArray(specificTests)) {
      testsToRun = testCases.filter(t => specificTests.includes(t.name));
    } else if (runSubset) {
      testsToRun = testCases.filter(t => t.category === runSubset);
    }
    
    // Apply test limit if specified
    if (testLimit && typeof testLimit === 'number' && testLimit > 0 && testLimit < testsToRun.length) {
      testsToRun = testsToRun.slice(0, testLimit);
    }

    const runId = crypto.randomUUID();
    const results: any[] = [];
    let passed = 0;
    let failed = 0;

    console.log(`🧪 Starting eval run ${runId} with ${testsToRun.length} tests using judge: ${selectedJudgeModel}`);

    // Create Supabase client with service role for inserting results
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    for (const testCase of testsToRun) {
      console.log(`\nTesting: ${testCase.name}`);
      
      try {
        // Call Orbit chat function
        const { reply: orbitResponse, fullResponse } = await callOrbitChat(testCase.setup, testCase.studentInput);
        console.log(`Orbit response: "${orbitResponse.substring(0, 150)}..."`);
        
        // Evaluate with Claude
        const evaluation = await evaluateWithClaude(testCase, orbitResponse, selectedJudgeModel);
        
        const result = {
          run_id: runId,
          test_name: testCase.name,
          test_setup: testCase.setup,
          student_input: testCase.studentInput,
          expected_behavior: testCase.expectedBehavior,
          red_flags: testCase.redFlags,
          orbit_response: orbitResponse,
          passed: evaluation.pass,
          red_flags_found: evaluation.redFlagsFound,
          failure_reason: evaluation.pass ? null : evaluation.reason
        };
        
        results.push(result);
        
        // Store in database
        const { error: insertError } = await supabase
          .from("eval_results")
          .insert(result);
        
        if (insertError) {
          console.error("Failed to store result:", insertError);
        }
        
        if (evaluation.pass) {
          console.log(`✅ PASS: ${evaluation.reason}`);
          passed++;
        } else {
          console.log(`❌ FAIL: ${evaluation.reason}`);
          if (evaluation.redFlagsFound?.length) {
            console.log(`   Red flags: ${evaluation.redFlagsFound.join(", ")}`);
          }
          failed++;
        }
        
        // Small delay between tests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (testError) {
        const errMsg = testError instanceof Error ? testError.message : String(testError);
        console.error(`Error running test "${testCase.name}":`, testError);
        results.push({
          run_id: runId,
          test_name: testCase.name,
          test_setup: testCase.setup,
          student_input: testCase.studentInput,
          expected_behavior: testCase.expectedBehavior,
          red_flags: testCase.redFlags,
          orbit_response: `ERROR: ${errMsg}`,
          passed: false,
          red_flags_found: [],
          failure_reason: `Test execution error: ${errMsg}`
        });
        failed++;
      }
    }

    const summary = {
      run_id: runId,
      total: testsToRun.length,
      passed,
      failed,
      pass_rate: `${Math.round((passed / testsToRun.length) * 100)}%`,
      results
    };

    console.log(`\n📊 Results: ${passed}/${testsToRun.length} passed (${summary.pass_rate})`);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Eval runner error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
