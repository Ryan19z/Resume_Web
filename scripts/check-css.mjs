const port = process.argv[2] || "3004";
const base = `http://localhost:${port}/`;
const html = await fetch(base).then((r) => r.text());
const cssMatch = html.match(/href="([^"]*layout[^"]*\.css[^"]*)"/);
console.log("port", port);
console.log("css_href", cssMatch ? cssMatch[1] : "NONE");
if (cssMatch) {
  const cssUrl = cssMatch[1].startsWith("http")
    ? cssMatch[1]
    : new URL(cssMatch[1], base).href;
  const cssRes = await fetch(cssUrl);
  console.log("css_status", cssRes.status);
  const cssText = await cssRes.text();
  console.log("css_bytes", cssText.length);
  console.log("has_bg_paper_rule", cssText.includes("bg-paper") || cssText.includes("--color-paper"));
}
console.log("html_has_bg_paper_class", html.includes("bg-paper"));
