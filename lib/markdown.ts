// Tiny, dependency-free markdown renderer for the Insights writing studio.
// Supports: headings, paragraphs, bold/italic/code, links, images, lists,
// blockquotes, fenced code blocks, horizontal rules. Output is HTML-safe.

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // images first so they win over plain links
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    return `<img src="${src}" alt="${alt}" class="my-4 rounded-md max-w-full" loading="lazy" />`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    return `<a href="${href}" class="text-accent underline" target="_blank" rel="noreferrer noopener">${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-tint/10 px-1 py-0.5 text-xs">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|\W)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|\W)_([^_\n]+)_/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(source: string): string {
  if (!source) return "";
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  let inList: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }
  function closeList() {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      flushParagraph();
      closeList();
      const lang = line.replace(/^```/, "").trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(
        `<pre class="my-4 overflow-x-auto rounded-md bg-tint/[0.06] p-3 text-xs"><code data-lang="${lang}">${escapeHtml(buf.join("\n"))}</code></pre>`,
      );
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeList();
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const sizes = ["text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm"];
      out.push(
        `<h${level} class="mt-6 mb-3 font-bold ${sizes[level - 1]}">${renderInline(heading[2])}</h${level}>`,
      );
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      if (inList !== "ul") {
        closeList();
        out.push('<ul class="my-3 list-disc space-y-1 pl-6">');
        inList = "ul";
      }
      const content = line.replace(/^\s*[-*]\s+/, "");
      out.push(`<li>${renderInline(content)}</li>`);
      i++;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      if (inList !== "ol") {
        closeList();
        out.push('<ol class="my-3 list-decimal space-y-1 pl-6">');
        inList = "ol";
      }
      const content = line.replace(/^\s*\d+\.\s+/, "");
      out.push(`<li>${renderInline(content)}</li>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      closeList();
      const content = line.replace(/^\s*>\s?/, "");
      out.push(
        `<blockquote class="my-4 border-l-2 border-accent/60 pl-3 italic text-muted">${renderInline(content)}</blockquote>`,
      );
      i++;
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph();
      closeList();
      out.push('<hr class="my-6 border-tint/15" />');
      i++;
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flushParagraph();
  closeList();
  return out.join("\n");
}
