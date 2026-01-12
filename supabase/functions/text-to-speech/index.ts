import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert LaTeX math notation to speakable text
function convertMathToSpeakable(text: string): string {
  let speakable = text;
  
  // Remove LaTeX delimiters
  speakable = speakable.replace(/\$\$/g, '');
  speakable = speakable.replace(/\$/g, '');
  
  // Convert common LaTeX to words
  speakable = speakable.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
  speakable = speakable.replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1');
  speakable = speakable.replace(/\\Rightarrow/g, 'implies');
  speakable = speakable.replace(/\\Leftrightarrow/g, 'if and only if');
  speakable = speakable.replace(/\\pm/g, 'plus or minus');
  speakable = speakable.replace(/\\times/g, 'times');
  speakable = speakable.replace(/\\div/g, 'divided by');
  speakable = speakable.replace(/\\neq/g, 'not equal to');
  speakable = speakable.replace(/\\leq/g, 'less than or equal to');
  speakable = speakable.replace(/\\geq/g, 'greater than or equal to');
  speakable = speakable.replace(/\\infty/g, 'infinity');
  speakable = speakable.replace(/\\pi/g, 'pi');
  speakable = speakable.replace(/\\theta/g, 'theta');
  speakable = speakable.replace(/\\alpha/g, 'alpha');
  speakable = speakable.replace(/\\beta/g, 'beta');
  
  // Convert superscripts: x^2 -> x squared, x^3 -> x cubed
  speakable = speakable.replace(/\^2(?![0-9])/g, ' squared');
  speakable = speakable.replace(/\^3(?![0-9])/g, ' cubed');
  speakable = speakable.replace(/\^{(\d+)}/g, ' to the power of $1');
  speakable = speakable.replace(/\^(\d+)/g, ' to the power of $1');
  speakable = speakable.replace(/\^{([a-z])}/gi, ' to the $1');
  speakable = speakable.replace(/\^([a-z])/gi, ' to the $1');
  
  // Convert subscripts: x_1 -> x sub 1
  speakable = speakable.replace(/_\{([^}]+)\}/g, ' sub $1');
  speakable = speakable.replace(/_(\d)/g, ' sub $1');
  
  // Clean up remaining backslashes and braces
  speakable = speakable.replace(/\\[a-z]+/gi, ''); // Remove other LaTeX commands
  speakable = speakable.replace(/[{}]/g, '');
  
  // Clean up multiple spaces
  speakable = speakable.replace(/\s+/g, ' ').trim();
  
  return speakable;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "fable" } = await req.json(); // fable = British English voice
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!text || typeof text !== "string") {
      throw new Error("Text is required");
    }

    // Truncate very long text to avoid API limits
    const truncatedText = text.length > 4000 ? text.slice(0, 4000) + "..." : text;
    
    // Convert math notation to speakable text
    const speakableText = convertMathToSpeakable(truncatedText);

    console.log("Generating TTS for speakable text:", speakableText.slice(0, 100));

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: speakableText,
        voice: voice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS API error:", response.status, errorText);
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(arrayBuffer);

    console.log("TTS generated successfully, audio size:", arrayBuffer.byteLength);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating TTS:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
