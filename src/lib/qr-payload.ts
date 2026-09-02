export type CodeType = "url" | "text" | "wifi" | "vcard" | "whatsapp" | "barcode";
export type ErrorLevel = "L" | "M" | "Q" | "H";

export interface QrFields {
  url: string;
  text: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: "WPA" | "WEP" | "nopass";
  vcardName: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardOrg: string;
  waPhone: string;
  waMessage: string;
  barcodeValue: string;
}

export const emptyFields: QrFields = {
  url: "https://lovable.dev",
  text: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiEncryption: "WPA",
  vcardName: "",
  vcardPhone: "",
  vcardEmail: "",
  vcardOrg: "",
  waPhone: "",
  waMessage: "",
  barcodeValue: "123456789012",
};

const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");

export function buildPayload(type: CodeType, f: QrFields): string {
  switch (type) {
    case "url":
      return f.url.trim();
    case "text":
      return f.text;
    case "wifi":
      return `WIFI:T:${f.wifiEncryption};S:${esc(f.wifiSsid)};${
        f.wifiEncryption === "nopass" ? "" : `P:${esc(f.wifiPassword)};`
      };`;
    case "vcard":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${f.vcardName}`,
        f.vcardOrg ? `ORG:${f.vcardOrg}` : "",
        f.vcardPhone ? `TEL;TYPE=CELL:${f.vcardPhone}` : "",
        f.vcardEmail ? `EMAIL:${f.vcardEmail}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    case "whatsapp": {
      const phone = f.waPhone.replace(/[^\d]/g, "");
      return `https://wa.me/${phone}${f.waMessage ? `?text=${encodeURIComponent(f.waMessage)}` : ""}`;
    }
    case "barcode":
      return f.barcodeValue.trim();
  }
}

export interface ParsedIntent {
  type: CodeType;
  fields: Partial<QrFields>;
  design?: { fg?: string; bg?: string; size?: number; level?: ErrorLevel };
  note?: string;
}

/** Client-side regex fallback used when the AI endpoint is unavailable. */
export function parseIntentLocally(prompt: string): ParsedIntent {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  const wifi = lower.match(
    /(?:network|ssid|wifi)\s*(?:named|called|is|:)?\s*["'“]?([\w\s.-]{1,32}?)["'”]?\s*(?:,|and|with)?\s*(?:password|pass|pwd|key)\s*(?:is|:)?\s*["'“]?([^\s"'”,]{1,63})/i,
  );
  if (wifi) {
    return {
      type: "wifi",
      fields: {
        wifiSsid: wifi[1].trim(),
        wifiPassword: wifi[2],
        wifiEncryption: /wep/i.test(lower) ? "WEP" : "WPA",
      },
      note: "Parsed locally (WiFi)",
    };
  }

  if (/vcard|contact card|business card/i.test(lower)) {
    const name = p.match(/(?:for|of)\s+([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)+)/);
    const phone = p.match(/(\+?\d[\d\s()-]{6,}\d)/);
    const email = p.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    return {
      type: "vcard",
      fields: {
        vcardName: name?.[1] ?? "",
        vcardPhone: phone?.[1]?.trim() ?? "",
        vcardEmail: email?.[0] ?? "",
      },
      note: "Parsed locally (vCard)",
    };
  }

  if (/whatsapp|wa\.me/i.test(lower)) {
    const phone = p.match(/(\+?\d[\d\s()-]{6,}\d)/);
    const msg = p.match(/(?:message|text|saying)\s*["'“]?([^"'”]+)["'”]?/i);
    return {
      type: "whatsapp",
      fields: { waPhone: phone?.[1]?.replace(/\D/g, "") ?? "", waMessage: msg?.[1]?.trim() ?? "" },
      note: "Parsed locally (WhatsApp)",
    };
  }

  if (/barcode|ean|upc|code ?128/i.test(lower)) {
    const val = p.match(/\b(\d{6,14})\b/);
    return {
      type: "barcode",
      fields: { barcodeValue: val?.[1] ?? "123456789012" },
      note: "Parsed locally (Barcode)",
    };
  }

  const url = p.match(/https?:\/\/[^\s"']+|(?:www\.)[^\s"']+/i);
  if (url) {
    const raw = url[0];
    return {
      type: "url",
      fields: { url: raw.startsWith("http") ? raw : `https://${raw}` },
      note: "Parsed locally (URL)",
    };
  }

  return { type: "text", fields: { text: p }, note: "Parsed locally (Text)" };
}
