import { validateOverviewData } from "../core/overview.js";

const MODEL = "claude-haiku-5-5";
const CACHE_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 8192;
const SYSTEM = `You explain precomputed youth-group connection reports to a busy group leader.
Write 120-180 words in three short plain-text paragraphs: an overview, something to watch,
and one practical idea for the next session. No Markdown, HTML, jargon, or em dashes.
Use only the supplied numbers. Do not calculate new scores, label the group good or bad,
invent people or activities, diagnose kids, or claim a cause or a trend from two sessions.

Definitions:
present = people marked as attending. answered = returned check-ins, including blank ones.
A connection exists when either person reported working with or talking to the other.
These are reported interactions in this session, not proof of friendship or its absence.
density is the share of POSSIBLE PAIRS that connected, not the share of people connected.
centralization runs from 0 (equal degrees) to 1 (a star). Explain it as connections being
concentrated around fewer people; you cannot identify who those people are.
averageLinks is reported connections per person, on average.
isolates = no connections and at least one rating answered.
unknown = no connections and neither rating answered, whether the check-in was blank or absent.
Do not call unknown people isolated or claim all of them failed to return a check-in.
Q4 measures closeness to the group, from 1 to 7. Q5 measures belonging, from 1 to 5.
The averages exclude skipped questions. null means not enough information, never zero.
Always qualify ratings with the number of answers and their scale. Missing check-ins limit
what the network tells us. One session is a snapshot, not a trend.

For comparisons:
before.numbers and after.numbers describe the entire attendance of each session.
Only comparison.q4 and comparison.q5 compare the same people who attended AND answered
that question both times. Use those paired means for changes in feelings, never differences
between whole-session rating averages. The Q4 and Q5 paired sample sizes can differ.
New/lost connections count only pairs of people attending both sessions.
stillIsolated counts people with no connections and nonblank ratings in both sessions.
When paired feelings rise but people remain isolated, make that contrast clear and kind.
If nobody attended both sessions, say a like-for-like comparison is not possible.
If a paired question has count 0, do not claim its ratings rose, fell, or stayed the same.
Any suggested next step is a possibility for the leader to consider, not a conclusion.`;

function reply(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function createOverviewHandler({
  getApiKey = () => process.env.ANTHROPIC_API_KEY,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  const cache = new Map();
  const pending = new Map();
  let starts = [];

  return async function overview(request) {
    if (request.method !== "POST") {
      return reply({ error: "Use POST to request an overview." }, 405, { Allow: "POST" });
    }
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return reply({ error: "Send the overview numbers as JSON." }, 415);
    }
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
      return reply({ error: "The overview request is too large." }, 413);
    }
    let data;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
        return reply({ error: "The overview request is too large." }, 413);
      }
      data = validateOverviewData(JSON.parse(text));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return reply({ error: error instanceof SyntaxError ? "The overview JSON is invalid." : error.message }, 400);
      }
      console.error("Could not read overview request", error);
      return reply({ error: "The overview request could not be read. Please try again." }, 400);
    }
    const apiKey = getApiKey()?.trim();
    if (!apiKey) {
      return reply({
        code: "not_configured",
        error: "AI overviews aren't connected yet. The usual numbers and reports still work.",
      }, 503);
    }
    const key = JSON.stringify(data);
    const time = now();
    const saved = cache.get(key);
    if (saved && saved.expires > time) return reply(saved.value);
    for (const [oldKey, entry] of cache) if (entry.expires <= time) cache.delete(oldKey);
    if (pending.has(key)) return (await pending.get(key)).clone();

    // Best-effort limits within a running function, not a global billing cap.
    starts = starts.filter((started) => time - started < 60_000);
    if (pending.size >= 2 || starts.length >= 10) {
      return reply({ error: "The overview service is busy. Please try again in a minute." }, 429, { "Retry-After": "60" });
    }
    starts.push(time);
    const work = generate();
    pending.set(key, work);
    try {
      return (await work).clone();
    } finally {
      pending.delete(key);
    }

    async function generate() {
      try {
        const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2026-10-21",
          },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            model: MODEL, max_tokens: 700,
            thinking: { type: "disabled" },
            output_config: { effort: "low" },
            system: SYSTEM,
            messages: [{ role: "user", content: `Explain this report:\n${key}` }],
          }),
        });
        if (!response.ok) {
          console.error("Anthropic overview request failed", {
            status: response.status, requestId: response.headers.get("request-id"),
          });
          return reply({
            error: response.status === 429
              ? "The AI service is busy. Please try again in a minute."
              : "The AI service couldn't write the overview. Please try again later.",
          }, response.status === 429 ? 429 : 502);
        }
        const result = await response.json();
        const text = Array.isArray(result.content)
          ? result.content.filter((block) => block.type === "text" && typeof block.text === "string")
            .map((block) => block.text).join("\n\n").trim()
          : "";
        if (result.stop_reason !== "end_turn" || !text || text.length > 6000) {
          console.error("Anthropic returned an incomplete overview", { stopReason: result.stop_reason });
          return reply({ error: "The AI didn't finish the overview. Please try again." }, 502);
        }
        const value = { text, generatedAt: new Date(now()).toISOString() };
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, { value, expires: now() + CACHE_MS });
        return reply(value);
      } catch (error) {
        const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
        console.error("Overview generation failed", { name: error.name, message: error.message });
        return reply({
          error: timedOut
            ? "The AI took too long. Please try again."
            : "Couldn't reach the AI service. Please try again.",
        }, timedOut ? 504 : 502);
      }
    }
  };
}

export default { fetch: createOverviewHandler() };
