import fetch from "node-fetch";

const ALLOWED_DOMAINS = [
  "pikuflix.vercel.app",
  "api.github.com"
];

export default async function handler(req, res) {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send("❌ No URL specified.");
    }

    const urlObj = new URL(targetUrl);
    if (!ALLOWED_DOMAINS.includes(urlObj.hostname)) {
      return res.status(403).send("🚫 This site is blocked.");
    }

    const response = await fetch(targetUrl);
    const contentType = response.headers.get("content-type") || "text/plain";
    res.setHeader("content-type", contentType);

    const body = await response.text();
    res.send(body);
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
}
