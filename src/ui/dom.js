// Small DOM helpers: escaping, element creation, toasts and modals.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function toast(html, { kind = "", ms = 3200 } = {}) {
  let box = $("#toasts");
  const t = el(`<div class="toast ${kind}" role="status">${html}</div>`);
  box.append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, ms);
}

let openModal = null;
/** Opens a modal dialog. Returns { root, close }. onClose runs once. */
export function modal(html, { cls = "", onClose, dismissable = true } = {}) {
  closeModal();
  const root = el(`<div class="modal-back"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`);
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add("in"));
  const close = () => {
    if (!root.isConnected) return;
    root.classList.remove("in");
    setTimeout(() => root.remove(), 220);
    document.removeEventListener("keydown", onKey);
    if (openModal === api) openModal = null;
    onClose?.();
  };
  const onKey = (e) => { if (e.key === "Escape" && dismissable) { e.stopPropagation(); close(); } };
  document.addEventListener("keydown", onKey);
  if (dismissable) root.addEventListener("pointerdown", (e) => { if (e.target === root) close(); });
  root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  const api = { root: root.firstElementChild, close };
  openModal = api;
  setTimeout(() => root.querySelector("[autofocus], button, input, select, textarea")?.focus(), 50);
  return api;
}
export function closeModal() { openModal?.close(); }
export const modalIsOpen = () => !!openModal;
