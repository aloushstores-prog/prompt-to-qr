import { useEffect } from "react";
import type { CodeType, ErrorLevel } from "@/lib/qr-payload";

export interface RenderOptions {
  value: string;
  type: CodeType;
  fg: string;
  bg: string;
  size: number;
  level: ErrorLevel;
  logo: string | null;
}

export async function renderToCanvas(canvas: HTMLCanvasElement, o: RenderOptions) {
  if (!o.value) {
    const ctx = canvas.getContext("2d");
    canvas.width = o.size;
    canvas.height = o.size;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  if (o.type === "barcode") {
    const JsBarcode = (await import("jsbarcode")).default;
    JsBarcode(canvas, o.value, {
      format: "CODE128",
      lineColor: o.fg,
      background: o.bg,
      width: 2,
      height: Math.round(o.size / 2.5),
      displayValue: true,
      margin: 16,
      font: "monospace",
    });
    return;
  }

  const QRCode = (await import("qrcode")).default;
  await QRCode.toCanvas(canvas, o.value, {
    width: o.size,
    margin: 2,
    errorCorrectionLevel: o.level,
    color: { dark: o.fg, light: o.bg },
  });

  if (o.logo) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = o.logo;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    const box = canvas.width * 0.24;
    const x = (canvas.width - box) / 2;
    ctx.fillStyle = o.bg;
    ctx.fillRect(x - 6, x - 6, box + 12, box + 12);
    ctx.drawImage(img, x, x, box, box);
  }
}

export async function buildSvg(o: RenderOptions): Promise<string> {
  if (o.type === "barcode") {
    const JsBarcode = (await import("jsbarcode")).default;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, o.value, {
      format: "CODE128",
      lineColor: o.fg,
      background: o.bg,
      displayValue: true,
      margin: 16,
      xmlDocument: document,
    });
    return new XMLSerializer().serializeToString(svg);
  }
  const QRCode = (await import("qrcode")).default;
  return QRCode.toString(o.value, {
    type: "svg",
    margin: 2,
    width: o.size,
    errorCorrectionLevel: o.level,
    color: { dark: o.fg, light: o.bg },
  });
}

export function CodeCanvas({
  canvasRef,
  options,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  options: RenderOptions;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void renderToCanvas(canvas, options);
  }, [canvasRef, options]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Generated code preview"
      className="h-auto w-full max-w-[340px] rounded-xl"
    />
  );
}
