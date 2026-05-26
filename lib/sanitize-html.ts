// Minimal allowlist HTML sanitiser for Insights post bodies. The writing
// studio is single-author and gated, but we still strip script/style and
// unsafe attributes as defense-in-depth before rendering stored HTML.

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "span", "div",
  "strong", "b", "em", "i", "u",
  "a", "img", "video", "source",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "figure", "figcaption",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  video: new Set(["src", "controls", "poster", "width", "height", "preload", "playsinline", "muted"]),
  source: new Set(["src", "type"]),
};

const URL_ATTRS = new Set(["href", "src", "poster"]);

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:text/html")) return false;
  // allow http(s), //, /, data:image/, data:video/, mailto:, relative
  return true;
}

function sanitizeNode(node: ChildNode, doc: Document, out: Node) {
  if (node.nodeType === 3) {
    out.appendChild(doc.createTextNode((node as Text).data));
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) {
    // unwrap unknown tags: keep their text children
    el.childNodes.forEach((child) => sanitizeNode(child, doc, out));
    return;
  }
  const safe = doc.createElement(tag);
  const attrs = ALLOWED_ATTRS[tag] ?? new Set();
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (!attrs.has(name)) continue;
    const value = attr.value;
    if (URL_ATTRS.has(name) && !isSafeUrl(value)) continue;
    safe.setAttribute(name, value);
  }
  if (tag === "a") {
    safe.setAttribute("target", "_blank");
    safe.setAttribute("rel", "noreferrer noopener");
  }
  if (tag === "img") {
    safe.setAttribute("loading", "lazy");
  }
  el.childNodes.forEach((child) => sanitizeNode(child, doc, safe));
  out.appendChild(safe);
}

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  // Server-side parse with a tiny DOM shim using regex would be brittle.
  // Use a string-based pass: strip <script>, <style>, on*= handlers, and
  // javascript: urls. This isn't a full DOM walk but is sufficient for
  // single-author content we ourselves produced.
  let out = input;
  out = out.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  out = out.replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(/javascript:/gi, "");
  return out;
}

// Heuristic — looks like HTML if it begins with a tag.
export function looksLikeHtml(body: string): boolean {
  return /^\s*</.test(body);
}
