// Small DOM and formatting helpers.

export const $ = id => document.getElementById(id);

const ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"};
export const esc = value => String(value).replace(/[&<>"]/g, c => ESCAPES[c]);

// Data Dragon descriptions contain markup; keep line breaks, drop the rest.
export const plain = markup =>
  esc((markup || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\n+/g, "<br>");

// The page updates in place every second. Nodes are only touched when their content changes, so hovering
// (and the tooltip) isn't interrupted and images don't reload.
export const html = (el, markup) => {
  if (el._html !== markup) {
    el._html = markup;
    el.innerHTML = markup;
  }
};

export const text = (el, value) => {
  if (el.textContent !== value) el.textContent = value;
};

// Thousands separators only from five digits up: 4850 reads cleaner than 4,850, while 31,350 still needs one.
export const num = n => {
  const r = Math.round(n);
  return Math.abs(r) < 10000 ? String(r) : r.toLocaleString("en-US");
};

export const signed = n => (n >= 0 ? "+" : "−") + num(Math.abs(n));

// Lowercase letters and digits only, for matching names that differ in spacing or punctuation.
export const squash = value =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// localStorage can be unavailable (blocked or full); preferences then just don't persist.
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not persisted.
    }
  },
};

// Image loading. Failed images are retried with growing delays (the server caches successes) before being hidden.
const MAX_IMAGE_RETRIES = 5;

function retryImage(img) {
  const attempt = Number(img.dataset.attempt || 0);
  if (attempt >= MAX_IMAGE_RETRIES) {
    img.style.visibility = "hidden";
    return;
  }
  img.dataset.attempt = attempt + 1;
  setTimeout(
    () => {
      img.src = `${img.dataset.want}?r=${attempt + 1}`;
    },
    1000 * (attempt + 1),
  );
}

// Extension pages can't use inline onerror handlers, and error events don't bubble, so listen in the capture phase.
export function watchImageErrors() {
  document.addEventListener(
    "error",
    e => {
      if (e.target.tagName === "IMG") retryImage(e.target);
    },
    true,
  );
}

export function setImage(img, src) {
  // Compare against the wanted URL, not the attribute: retries append ?r=N, and without this every tick would
  // see a mismatch, reset the retry count and restart a slow load.
  if (img.dataset.want === src) return;
  img.dataset.want = src;
  img.removeAttribute("data-attempt");
  img.style.visibility = "";
  img.setAttribute("src", src);
}
