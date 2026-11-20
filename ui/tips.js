// The tips icon in the top bar. Each screen keeps its own tips in its .html
// file, inside <dialog id="tips">, so the wording can change without code.
import { el, svgEl } from "./app.js";

const tips = document.getElementById("tips");
const help = document.querySelector("header.top .help");

// The icon is added here rather than written in the .html, so if this file
// fails to load there's no icon that does nothing when tapped.
if (tips && help) {
  help.before(el("button", {
    type: "button",
    className: "help",
    title: "Tips for this page",
    "aria-label": "Tips for this page",
    onclick: () => tips.showModal(),
  }, lightbulb()));

  // A tap on the dimmed area around the sheet closes it. Those taps land on
  // the dialog itself, while taps on the sheet land on the box inside it.
  tips.addEventListener("click", (event) => {
    if (event.target === tips) tips.close();
  });
}

function lightbulb() {
  return svgEl("svg", {
    viewBox: "0 0 24 24", width: 18, height: 18, fill: "none", stroke: "currentColor",
    "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  },
  svgEl("path", { d: "M9 18h6" }),
  svgEl("path", { d: "M10 22h4" }),
  svgEl("path", { d: "M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" }),
  );
}
