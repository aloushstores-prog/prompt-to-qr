import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `You convert natural language requests into a structured QR/barcode payload spec.
Return ONLY minified JSON, no markdown, matching:
{"type":"url|text|wifi|vcard|whatsapp|barcode","fields":{...},"design":{"fg":"#RRGGBB","bg":"#RRGGBB","size":number,"level":"L|M|Q|H"},"note":"short human summary"}
Allowed field keys: url, text, wifiSsid, wifiPassword, wifiEncryption(WPA|WEP|nopass), vcardName, vcardPhone, vcardEmail, vcardOrg, waPhone (digits only, no +), waMessage, barcodeValue.
Only include fields relevant to the chosen type. size is 128-1024. Prefer level "M" unless a logo is mentioned (then "H").`;

export const parseIntentWithAI = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ prompt: z.string().min(1).max(2000) }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "no_key" };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: res.status === 429 ? "rate_limited" : "upstream" };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false as const, error: "unparseable" };

    try {
      return { ok: true as const, result: JSON.parse(match[0]) as unknown };
    } catch {
      return { ok: false as const, error: "unparseable" };
    }
  });
