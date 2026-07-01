const presets = {
  basic: {
    html: `<article>
  <h1>Welcome to html2md</h1>
  <p>This is a <strong>fast</strong> HTML to Markdown converter.</p>
  <p>It keeps the structure while trimming noisy markup.</p>
</article>`,
    note: "Basic text keeps headings and inline emphasis clean."
  },
  lists: {
    html: `<ol start="4">
  <li>Review the source</li>
  <li>Pick the plugin</li>
  <li>
    <blockquote>Ship the Markdown result</blockquote>
  </li>
</ol>`,
    note: "Ordered lists preserve the starting number, and blockquotes can stay nested."
  },
  table: {
    html: `<table>
  <thead>
    <tr><th>Name</th><th align="right">Value</th></tr>
  </thead>
  <tbody>
    <tr><td>Alpha</td><td>10</td></tr>
    <tr><td><code>Beta</code></td><td>20</td></tr>
  </tbody>
</table>`,
    note: "Tables are one of the project strengths, including alignment and inline code."
  },
  blogger: {
    html: `<a href="https://blogger.googleusercontent.com/img/a/AVvXsEgAVLxrIo88uOQOiWrIflynvHe-Bnq1qpPhUgPT4R5WZxGaemKT0-rMzGwXJAlov6e8JbUEC4GURpwdZTb25uv7iuZrD8KQVXafQK2mlJJ0H_zAy8p2Tb8_Tca39_eGVWK98pFHM5iQgbAiMXyPmsj5LdiMJmQNdqYbzE2E67l7aoXM8TviN3A0vmWQ">
  <img src="https://blogger.googleusercontent.com/img/a/AVvXsEgAVLxrIo88uOQOiWrIflynvHe-Bnq1qpPhUgPT4R5WZxGaemKT0-rMzGwXJAlov6e8JbUEC4GURpwdZTb25uv7iuZrD8KQVXafQK2mlJJ0H_zAy8p2Tb8_Tca39_eGVWK98pFHM5iQgbAiMXyPmsj5LdiMJmQNdqYbzE2E67l7aoXM8TviN3A0vmWQ=s16000" />
</a>`,
    note: "Blogger image wrappers are flattened before conversion."
  },
  code: {
    html: `<pre><code>func main() {
    fmt.Println("hello markdown")
}</code></pre>`,
    note: "Fenced code blocks stay readable and are easy to copy into docs."
  }
};

const presetBar = document.querySelector("#preset-bar");
const htmlView = document.querySelector("#html-view");
const markdownView = document.querySelector("#markdown-view");
const presetNote = document.querySelector("#preset-note");
const copyHtml = document.querySelector("#copy-html");
const copyMarkdown = document.querySelector("#copy-markdown");
const convertButton = document.querySelector("#convert-button");
const statusText = document.querySelector("#status-text");
const fileInput = document.querySelector("#file-input");

function normalizeBloggerImageUrl(raw) {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.hostname.toLowerCase() !== "blogger.googleusercontent.com") {
      return null;
    }

    parsed.search = "";
    parsed.hash = "";

    const parts = parsed.pathname.split("/");
    const last = parts[parts.length - 1];
    const cut = last.indexOf("=");
    if (cut >= 0) {
      parts[parts.length - 1] = last.slice(0, cut);
      parsed.pathname = parts.join("/");
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function flattenBloggerImageLinks(sourceHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceHtml, "text/html");

  doc.querySelectorAll("a[href]").forEach((anchor) => {
    const meaningfulChildren = Array.from(anchor.childNodes).filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim() !== "";
      }
      return node.nodeType === Node.ELEMENT_NODE;
    });

    if (meaningfulChildren.length !== 1) {
      return;
    }

    const onlyChild = meaningfulChildren[0];
    if (!(onlyChild instanceof HTMLImageElement)) {
      return;
    }

    const normalizedHref = normalizeBloggerImageUrl(anchor.getAttribute("href") || "");
    const normalizedSrc = normalizeBloggerImageUrl(onlyChild.getAttribute("src") || "");
    if (!normalizedHref || !normalizedSrc || normalizedHref !== normalizedSrc) {
      return;
    }

    anchor.replaceWith(onlyChild.cloneNode(true));
  });

  return doc.body.innerHTML;
}

function createConverter() {
  if (!window.TurndownService) {
    throw new Error("Turndown failed to load");
  }

  const service = new window.TurndownService({
    codeBlockStyle: "fenced",
    headingStyle: "atx",
    bulletListMarker: "-",
    emDelimiter: "*"
  });

  if (window.turndownPluginGfm) {
    service.use(window.turndownPluginGfm.gfm);
  }

  return service;
}

function convertHtmlToMarkdown(sourceHtml) {
  const prepared = flattenBloggerImageLinks(sourceHtml);
  const service = createConverter();
  return service.turndown(prepared).trim();
}

function setPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  htmlView.value = preset.html;
  presetNote.textContent = preset.note;
  statusText.textContent = "Ready to convert the selected example.";

  document.querySelectorAll(".preset").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === name);
  });

  runConversion();
}

async function copyFrom(element, button) {
  const text = "value" in element ? element.value : element.textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }

  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = "Copy";
  }, 1200);
}

function runConversion() {
  const sourceHtml = htmlView.value.trim();
  if (!sourceHtml) {
    markdownView.textContent = "";
    statusText.textContent = "Paste HTML or load a file to begin.";
    return;
  }

  convertButton.disabled = true;
  statusText.textContent = "Converting...";

  window.setTimeout(() => {
    try {
      const markdown = convertHtmlToMarkdown(sourceHtml);
      markdownView.textContent = markdown;
      statusText.textContent = "Converted locally in your browser.";
    } catch (error) {
      markdownView.textContent = "";
      statusText.textContent = `Conversion failed: ${error.message}`;
    } finally {
      convertButton.disabled = false;
    }
  }, 10);
}

presetBar.addEventListener("click", (event) => {
  const button = event.target.closest(".preset");
  if (!button) return;
  setPreset(button.dataset.preset);
});

copyHtml.addEventListener("click", () => copyFrom(htmlView, copyHtml));
copyMarkdown.addEventListener("click", () => copyFrom(markdownView, copyMarkdown));
convertButton.addEventListener("click", runConversion);

fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    htmlView.value = text;
    presetNote.textContent = `Loaded file: ${file.name}`;
    statusText.textContent = `Loaded ${file.name}. Click convert or edit the HTML first.`;
  } catch {
    statusText.textContent = "Failed to read the selected file.";
  }
});

htmlView.addEventListener("input", () => {
  statusText.textContent = "Content changed. Click convert to refresh the Markdown output.";
});

setPreset("basic");
