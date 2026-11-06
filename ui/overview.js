import { el, showError } from "./app.js";

const saved = new Map();

export function overviewCard(data) {
  const key = JSON.stringify(data);
  const output = el("div", { className: "overview-text", "aria-live": "polite" });
  const button = el("button", {
    type: "button", className: "secondary", onclick: generate,
  }, "Explain these results");
  const card = el("section", { className: "card ai-overview" },
    el("h2", {}, "A plain-English overview"),
    el("p", { className: "muted" },
      "A short explanation of the numbers shown here, plus an idea for the next session."),
    button,
    output,
    el("p", { className: "muted overview-note" },
      "AI-generated from group-level numbers only. Names and individual answers are not sent. ",
      "Use it alongside the report and what you observed, not as a diagnosis."),
  );
  if (saved.has(key)) display(saved.get(key));
  return card;

  function display(text) {
    output.replaceChildren(...text.split(/\n\s*\n/).filter(Boolean).map((paragraph) => el("p", {}, paragraph)));
    button.remove();
  }

  async function generate() {
    if (button.disabled) return;
    button.disabled = true;
    output.replaceChildren(el("p", { className: "muted", role: "status" }, "Writing the overview..."));
    try {
      const response = await fetch("/api/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: key,
        signal: AbortSignal.timeout(40_000),
      });
      if (response.status === 404) {
        throw new Error("AI overviews need a Vercel preview or npm run dev:ai. The static preview only runs the screens.");
      }
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The overview service returned an unexpected response. Please try again.");
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The overview could not be written. Please try again.");
      if (typeof result.text !== "string" || !result.text.trim()) {
        throw new Error("The overview service returned an empty explanation. Please try again.");
      }
      if (saved.size >= 20) saved.delete(saved.keys().next().value);
      saved.set(key, result.text);
      display(result.text);
    } catch (error) {
      const message = error.name === "TimeoutError"
        ? new Error("The overview took too long. Please try again.")
        : error;
      showError(message, output);
    } finally {
      button.disabled = false;
    }
  }
}
