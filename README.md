# AI QR Studio

Role & Goal:

Build a full-stack, single-page web application using React, Tailwind CSS, and TypeScript called "AI QR & Barcode Generator". The app must function as a smart tool for generating customized QR codes and Barcodes, integrated with Google Gemini API for natural language generation, and fully prepared with the WebMCP protocol structure so AI agents can read and execute its functions.



1. Core Layout & UI (Single Page):

- Header: Minimalist navbar with title "AI QR Studio", a subtle WebMCP badge ("WebMCP Ready"), and a language toggle.

- Hero Section: A prominent AI input box with prompt suggestions (e.g., "Generate a WiFi QR code for network 'Home' with password '12345'" or "Create a vCard QR for John Doe").

- Main Generator Grid (Two Columns):

  * Left Panel (Inputs & AI Controls): Toggle tabs for manual input (URL, Text, WiFi, Contact, WhatsApp) or AI Assistant mode. Customization controls for colors, size, error correction level, and logo overlay.

  * Right Panel (Live Canvas Preview & Download): High-resolution canvas rendering the generated QR code or Barcode in real-time. Export buttons for PNG, SVG, and PDF formats.



2. AI Logic & Serverless Function (Gemini Integration):

- Integrate a lightweight client-side API call or serverless endpoint using Google Gemini 1.5 Flash (via @google/generative-ai).

- System Prompt for Gemini: Parse natural language user input into structured JSON payload containing the QR type, raw text/payload, and recommended design parameters.

- Fallback: If no API key is set, process requests using client-side JavaScript regex for common formats (URLs, WiFi, vCards) seamlessly.



3. WebMCP Protocol Implementation:

- Create a dedicated configuration file webmcp.json in the public directory and register the tool schema in window/head:

{

  "name": "AI QR Generator",

  "version": "1.0.0",

  "description": "Exposes tool capabilities for AI Agents to create QR codes and barcodes programmatically.",

  "tools": [

    {

      "name": "generate_qr",

      "description": "Generates a QR code image data URL based on payload and options.",

      "parameters": {

        "type": "object",

        "properties": {

          "text": { "type": "string", "description": "The URL, text, or structured payload to encode." },

          "type": { "type": "string", "enum": ["url", "wifi", "vcard", "text"] }

        },

        "required": ["text"]

      }

    }

  ]

}

- Expose window.__WEBMCP_TOOLS__ globally so ChatGPT or external WebMCP agents can invoke generate_qr() directly from the DOM.



4. Technical Requirements & Dependencies:

- Use qrcode.react or qrcode npm library for QR generation.

- Use jsbarcode for barcode rendering.

- Include built-in basic SEO meta tags, robots.txt, and sitemap.xml handlers in the output build.

- Fully responsive, modern dark mode UI 

using Tailwind CSS and Lucide React icons.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://prompt-to-qr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9347dfce-a4f4-4dd0-a36b-264fd6d19d5c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
