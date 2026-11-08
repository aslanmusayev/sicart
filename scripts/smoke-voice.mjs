// Manual end-to-end check of the voice pipeline WITHOUT a microphone: sends a typed turn to Gemini Live using the
// app's own token + setup, runs the model's tool calls through /api/tools and prints what the assistant says.
// Usage: node scripts/smoke-voice.mjs [baseUrl] ["what to say"] [persona]
const BASE = process.argv[2] ?? "http://localhost:3200";
const SAY = process.argv[3] ?? "I'm cooking carbonara for 4 tonight";
const PERSONA = process.argv[4] ?? "aysel";
const CART = 12;
const post = (path, body) =>
  fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

await post(`/api/session/${CART}/connect`, { persona: PERSONA });
const { token, setup, error } = await post("/api/voice/token", { cartId: CART });
if (!token) throw new Error("token: " + error);
const ws = new WebSocket(
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" +
    encodeURIComponent(token),
);
const t0 = Date.now();
let said = "";
let audioBytes = 0;
let firstAudioMs = null;
const timeout = setTimeout(() => finish("TIMEOUT"), 45000);
async function finish(reason) {
  clearTimeout(timeout);
  const snap = await fetch(`${BASE}/api/session/${CART}`).then((r) => r.json());
  console.log(`\n[${reason}] assistant said: "${said.trim()}"`);
  console.log(`audio: ${audioBytes} bytes, first audio after ${firstAudioMs} ms`);
  console.log("list now:", snap.list.map((l) => `${l.productId}${l.source === "recipe" ? "*" : ""}`).join(", "));
  console.log("focus:", snap.focus?.productId ?? "-");
  ws.close();
  process.exit(0);
}
ws.onopen = () => ws.send(JSON.stringify({ setup }));
ws.onmessage = async (ev) => {
  const msg = JSON.parse(typeof ev.data === "string" ? ev.data : await ev.data.text());
  if (msg.setupComplete) {
    console.log(`setupComplete after ${Date.now() - t0} ms; saying: "${SAY}"`);
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: SAY }] }], turnComplete: true } }));
  }
  if (msg.toolCall) {
    const responses = [];
    for (const fc of msg.toolCall.functionCalls) {
      const { result } = await post("/api/tools", { cartId: CART, name: fc.name, args: fc.args ?? {} });
      console.log(`tool ${fc.name}(${JSON.stringify(fc.args)}) ->`, JSON.stringify(result).slice(0, 400));
      responses.push({ id: fc.id, name: fc.name, response: result });
    }
    ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
  }
  const sc = msg.serverContent;
  if (sc?.outputTranscription?.text) said += sc.outputTranscription.text;
  for (const part of sc?.modelTurn?.parts ?? []) {
    if (part.inlineData?.data) {
      audioBytes += Math.floor((part.inlineData.data.length * 3) / 4);
      firstAudioMs ??= Date.now() - t0;
    }
  }
  if (sc?.turnComplete) finish("turnComplete");
};
ws.onclose = (e) => console.log("closed", e.code, e.reason);
