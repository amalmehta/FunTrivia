// The small feedback tab on the window edge. Notes are kept in the save
// (this browser only) and can be copied out in one click.

import { icon } from "../art/icons.js";
import { $, el, esc, modal, toast } from "./dom.js";

export function mountFeedback(app) {
  const tab = el(`<button class="feedback-tab" aria-label="Send feedback">${icon("chat", { size: 14 })}<span>Feedback</span></button>`);
  document.body.append(tab);
  tab.onclick = () => open(app);
}

function open(app) {
  const list = app.state.feedback;
  const m = modal(`
    <header class="modal-head"><h2>${icon("chat", { size: 20 })} Feedback</h2><button class="icon-btn" data-close aria-label="Close">${icon("close", { size: 18 })}</button></header>
    <div class="fb">
      <div class="seg" id="fb-kind">${["Idea", "Bug", "Question wrong", "Love it"].map((k, i) => `<button type="button" class="${i ? "" : "on"}" data-v="${k}">${k}</button>`).join("")}</div>
      <textarea id="fb-text" rows="4" placeholder="What would make FunTrivia better?" autofocus></textarea>
      <div class="ob-actions"><button class="btn ghost" id="fb-copy" ${list.length ? "" : "disabled"}>Copy all (${list.length})</button><button class="btn primary" id="fb-save">Save note</button></div>
      <p class="hint">Notes stay in this browser. Use “Copy all” to paste them into an email or issue.</p>
      ${list.length ? `<ul class="fb-list">${list.slice(-5).reverse().map((f) => `<li><small>${esc(f.date)} · ${esc(f.kind)}</small>${esc(f.text)}</li>`).join("")}</ul>` : ""}
    </div>`, { cls: "fb-modal" });
  let kind = "Idea";
  $("#fb-kind", m.root).onclick = (e) => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    kind = b.dataset.v;
    [...b.parentElement.children].forEach((x) => x.classList.toggle("on", x === b));
  };
  $("#fb-save", m.root).onclick = () => {
    const text = $("#fb-text", m.root).value.trim();
    if (!text) return $("#fb-text", m.root).focus();
    list.push({ date: new Date().toISOString().slice(0, 16).replace("T", " "), kind, text, where: location.hash || "#/map" });
    app.save();
    m.close();
    toast("Thanks! Your note is saved.");
  };
  $("#fb-copy", m.root).onclick = async () => {
    const txt = list.map((f) => `[${f.date}] ${f.kind} (${f.where}): ${f.text}`).join("\n");
    try { await navigator.clipboard.writeText(txt); toast("Feedback copied to clipboard."); } catch { toast("Couldn't reach the clipboard."); }
  };
}
