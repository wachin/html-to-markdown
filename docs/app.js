const presets = {
  basic: {
    html: `<article>
  <h1>Welcome to html2md</h1>
  <p>This is a <strong>fast</strong> HTML to Markdown converter.</p>
  <p>It keeps the structure while trimming noisy markup.</p>
</article>`,
    markdown: `# Welcome to html2md

This is a **fast** HTML to Markdown converter.

It keeps the structure while trimming noisy markup.`,
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
    markdown: `4. Review the source
5. Pick the plugin
6. > Ship the Markdown result`,
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
    markdown: `| Name   | Value |
|:-------|------:|
| Alpha  |    10 |
| \`Beta\` |    20 |`,
    note: "Tables are one of the project strengths, including alignment and inline code."
  },
  blogger: {
    html: `<a href="https://blogger.googleusercontent.com/img/a/AVvXsEgAVLxrIo88uOQOiWrIflynvHe-Bnq1qpPhUgPT4R5WZxGaemKT0-rMzGwXJAlov6e8JbUEC4GURpwdZTb25uv7iuZrD8KQVXafQK2mlJJ0H_zAy8p2Tb8_Tca39_eGVWK98pFHM5iQgbAiMXyPmsj5LdiMJmQNdqYbzE2E67l7aoXM8TviN3A0vmWQ">
  <img src="https://blogger.googleusercontent.com/img/a/AVvXsEgAVLxrIo88uOQOiWrIflynvHe-Bnq1qpPhUgPT4R5WZxGaemKT0-rMzGwXJAlov6e8JbUEC4GURpwdZTb25uv7iuZrD8KQVXafQK2mlJJ0H_zAy8p2Tb8_Tca39_eGVWK98pFHM5iQgbAiMXyPmsj5LdiMJmQNdqYbzE2E67l7aoXM8TviN3A0vmWQ=s16000" />
</a>`,
    markdown: `![](https://blogger.googleusercontent.com/img/a/AVvXsEgAVLxrIo88uOQOiWrIflynvHe-Bnq1qpPhUgPT4R5WZxGaemKT0-rMzGwXJAlov6e8JbUEC4GURpwdZTb25uv7iuZrD8KQVXafQK2mlJJ0H_zAy8p2Tb8_Tca39_eGVWK98pFHM5iQgbAiMXyPmsj5LdiMJmQNdqYbzE2E67l7aoXM8TviN3A0vmWQ=s16000)`,
    note: "This preset reflects the Blogger image wrapper support added in this fork."
  },
  code: {
    html: `<pre><code>func main() {
    fmt.Println("hello markdown")
}</code></pre>`,
    markdown: "```go\nfunc main() {\n    fmt.Println(\"hello markdown\")\n}\n```",
    note: "Fenced code blocks stay readable and are easy to copy into docs."
  }
};

const presetBar = document.querySelector("#preset-bar");
const htmlView = document.querySelector("#html-view");
const markdownView = document.querySelector("#markdown-view");
const presetNote = document.querySelector("#preset-note");
const copyHtml = document.querySelector("#copy-html");
const copyMarkdown = document.querySelector("#copy-markdown");

function setPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  htmlView.value = preset.html;
  markdownView.textContent = preset.markdown;
  presetNote.textContent = preset.note;

  document.querySelectorAll(".preset").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === name);
  });
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

presetBar.addEventListener("click", (event) => {
  const button = event.target.closest(".preset");
  if (!button) return;
  setPreset(button.dataset.preset);
});

copyHtml.addEventListener("click", () => copyFrom(htmlView, copyHtml));
copyMarkdown.addEventListener("click", () => copyFrom(markdownView, copyMarkdown));

setPreset("basic");
