// Typed-command fallback (PLAN.md R2): same tools and system instruction as the voice assistant, but over the
// plain generateContent API with text. Used from Demo Control when the hall is too loud or voice misbehaves.
import { getSnapshot } from "../session/store";
import { executeTool } from "./execute";
import { systemInstruction } from "./prompt";
import { FUNCTION_DECLARATIONS, TOOL_NAMES, type ToolName } from "./tools";

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

interface Part {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  [k: string]: unknown; // keep thought signatures untouched
}
interface Content {
  role: "user" | "model";
  parts: Part[];
}

async function generate(contents: Content[], instruction: string): Promise<Part[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  let lastError = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      }),
      signal: AbortSignal.timeout(20_000),
    }).catch((e) => {
      lastError = String(e);
      return null;
    });
    if (!res) continue;
    const json = await res.json();
    if (json.error) {
      lastError = json.error.message;
      continue;
    }
    return (json.candidates?.[0]?.content?.parts ?? []) as Part[];
  }
  throw new Error(`The assistant is unavailable (${lastError.slice(0, 120)})`);
}

export async function runCommand(cartId: number, text: string): Promise<{ reply: string; tools: string[] }> {
  const state = await getSnapshot(cartId).catch(() => null);
  const instruction = `${systemInstruction(state)}\n(The shopper typed this instead of speaking. Reply in one short sentence.)`;
  const contents: Content[] = [{ role: "user", parts: [{ text }] }];
  const used: string[] = [];

  for (let round = 0; round < 4; round++) {
    const parts = await generate(contents, instruction);
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      return { reply: parts.map((p) => p.text ?? "").join("").trim() || "Done.", tools: used };
    }
    contents.push({ role: "model", parts }); // as-is: Gemini 3 needs its thought signatures back
    const responses: Part[] = [];
    for (const p of calls) {
      const { name, args } = p.functionCall!;
      used.push(name);
      const result = TOOL_NAMES.includes(name as ToolName)
        ? await executeTool(cartId, name as ToolName, args ?? {}).catch((e: Error) => ({ ok: false, error: e.message }))
        : { ok: false, error: `Unknown tool ${name}` };
      responses.push({ functionResponse: { name, response: result } });
    }
    contents.push({ role: "user", parts: responses });
  }
  return { reply: "Done.", tools: used };
}
