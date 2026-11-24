// The welcome screen. Leaving it with "Get started" marks it as seen on this
// device, so the home page (index.html) goes straight to the groups next time.
// The "?" on every leader screen still opens it.
const start = document.getElementById("get-started");
start?.addEventListener("click", () => {
  try {
    localStorage.setItem("connected-welcome-seen", "yes");
  } catch {
    // Storage can be blocked (some private windows). The welcome screen just shows again.
  }
});
