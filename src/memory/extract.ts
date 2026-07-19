import { chat } from "../ollama/chat";

const EXTRACT_PROMPT = `
You are a memory extraction system.
Given a conversation exchange, extract 0 to 3 atomic facts worth remembering long-term.
Only extract facts that would be useful in future conversations.
Ignore small talk, greetings, and one-off questions.

Return ONLY a JSON array. Empty array if nothing is worth saving.
No markdown, no explanation.

Examples of things worth saving:
- User prefers TypeScript over JavaScript
- User is building a CLI tool called GooGo
- User's name is Bhavesh

Examples of things NOT worth saving:
- User asked what a black hole is
- User said thanks
- User asked to rename a function

Format:
[
  {
    "content": "one atomic fact as a sentence",
    "type": "preference | fact | project | person",
    "tags": ["tag1", "tag2"]
  }
]
`;

export interface ExtractedMemory {
  content: string;
  type: "preference" | "fact" | "project" | "person";
  tags: string[]
}

export async function extractedMemory(userMessage:string, aiResponse: string, model: string): Promise<ExtractedMemory[]> {
  const response = await chat({
    model,
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      {
        role: "user",
        content: `User said: "${userMessage}"\n\nAI responded: "${aiResponse.slice(0, 500)}"`
      }
    ],
  })

  if(!response) return []

  try {
    const cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()
    return JSON.parse(cleaned) as ExtractedMemory[]
  } catch {
    return []
  }

}
