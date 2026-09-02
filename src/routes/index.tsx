import { createFileRoute } from "@tanstack/react-router";
import { QrStudio } from "@/components/qr-studio/QrStudio";

const title = "AI QR Studio — AI QR Code & Barcode Generator";
const description =
  "Generate customized QR codes and barcodes from plain language: WiFi, vCard, WhatsApp, URLs. Export PNG, SVG, PDF. WebMCP-ready for AI agents.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "webmcp", href: "/webmcp.json", type: "application/json" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AI QR Studio",
          applicationCategory: "UtilitiesApplication",
          description,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: QrStudio,
});
