require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

app.use(express.json({ limit: "40mb" })); // generous limit: base64 event photos add up
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/evaluate", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: "لم يتم ضبط مفتاح Anthropic API على الخادم. أضيفي ANTHROPIC_API_KEY في ملف .env ثم أعيدي تشغيل الخادم."
    });
  }
  const { system, messages } = req.body || {};
  if (!system || !messages) {
    return res.status(400).json({ error: "طلب غير صالح: system و messages مطلوبان." });
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system,
        messages,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Anthropic API error:", data);
      return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من واجهة Anthropic API" });
    }
    res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "تعذر الاتصال بخدمة Anthropic API." });
  }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`مِعيار يعمل الآن على http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn("⚠ تحذير: ANTHROPIC_API_KEY غير مضبوط في .env — التقييم بالذكاء الاصطناعي لن يعمل حتى تضيفيه.");
  }
});
