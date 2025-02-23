import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeWriting(text: string): Promise<{
  suggestions: string;
  error?: string;
}> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      system: "You are an educational writing assistant. Analyze the text and provide clear, actionable suggestions for improvement. Focus on grammar, clarity, style, and academic tone. Format your response as a JSON object with a 'suggestions' field containing a string of line-separated suggestions.",
      max_tokens: 1024,
      messages: [
        { role: "user", content: text }
      ],
    });

    // Extract the content and ensure it's properly formatted
    const message = response.content[0];
    if ('text' in message) {
      return { suggestions: message.text };
    }
    return { suggestions: "No suggestions available", error: "Unexpected response format" };
  } catch (error) {
    console.error("Anthropic API error:", error);
    return {
      suggestions: "",
      error: "Failed to analyze writing. Please try again later.",
    };
  }
}

export async function executeCode(
  code: string,
  language: string,
): Promise<{
  output: string;
  error?: string;
}> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      system: `You are a ${language} code execution simulator. Run the code and return the output or any errors in a clear, formatted way.`,
      max_tokens: 1024,
      messages: [
        { role: "user", content: code }
      ],
    });

    const message = response.content[0];
    if ('text' in message) {
      return { output: message.text };
    }
    return { output: "", error: "Unexpected response format" };
  } catch (error) {
    console.error("Anthropic API error:", error);
    return {
      output: "",
      error: "Failed to execute code. Please try again later.",
    };
  }
}

export async function detectPlagiarism(text: string): Promise<{
  severity: "none" | "low" | "medium" | "high";
  analysis: string;
  matchedSources?: string[];
  error?: string;
}> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      system: `You are a plagiarism detection expert. Analyze the given text and return a JSON response with:
1. severity: "none" | "low" | "medium" | "high"
2. analysis: detailed explanation of your findings
3. matchedSources: array of potential sources (if any)`,
      max_tokens: 1024,
      messages: [
        { role: "user", content: text }
      ],
    });

    const message = response.content[0];
    if (!('text' in message)) {
      return {
        severity: "none",
        analysis: "Unable to analyze text",
        error: "Unexpected response format",
      };
    }

    try {
      const result = JSON.parse(message.text);
      if (!result.severity || !result.analysis) {
        throw new Error("Missing required fields");
      }

      return {
        severity: result.severity,
        analysis: result.analysis,
        matchedSources: result.matchedSources || [],
      };
    } catch (parseError) {
      console.error("Failed to parse Anthropic response:", parseError);
      return {
        severity: "none",
        analysis: "Unable to analyze text",
        error: "Failed to parse analysis results",
      };
    }
  } catch (error) {
    console.error("Anthropic API error:", error);
    return {
      severity: "none",
      analysis: "",
      error: "Failed to analyze text for plagiarism. Please try again later.",
    };
  }
}