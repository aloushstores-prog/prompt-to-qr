import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  QrCode,
  Download,
  FileImage,
  FileCode2,
  FileText,
  Wand2,
  Upload,
  X,
  Languages,
  Wifi,
  Link2,
  Type,
  Contact,
  MessageCircle,
  Barcode,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dict, type Lang } from "@/lib/i18n";
import {
  buildPayload,
  emptyFields,
  parseIntentLocally,
  type AiSpec,
  type CodeType,
  type ErrorLevel,
  type QrFields,
} from "@/lib/qr-payload";
import { parseIntentWithAI } from "@/lib/ai-parse.functions";
import { CodeCanvas, buildSvg, renderToCanvas, type RenderOptions } from "./CodePreview";

const TYPES: { id: CodeType; icon: typeof Link2 }[] = [
  { id: "url", icon: Link2 },
  { id: "text", icon: Type },
  { id: "wifi", icon: Wifi },
  { id: "vcard", icon: Contact },
  { id: "whatsapp", icon: MessageCircle },
  { id: "barcode", icon: Barcode },
];

const SUGGESTIONS = [
  "Generate a WiFi QR code for network 'Home' with password '12345'",
  "Create a vCard QR for John Doe, +1 555 0142, john@acme.com",
  "WhatsApp link for +9647701234567 saying 'Hi, I need a quote'",
  "Barcode for product 590123412345",
];

export function QrStudio() {
  const [lang, setLang] = useState<Lang>("en");
  const t = dict[lang];
  const rtl = lang === "ar";

  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [type, setType] = useState<CodeType>("url");
  const [fields, setFields] = useState<QrFields>(emptyFields);
  const [fg, setFg] = useState("#0c1420");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState(512);
  const [level, setLevel] = useState<ErrorLevel>("M");
  const [logo, setLogo] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const value = useMemo(() => buildPayload(type, fields), [type, fields]);
  const options: RenderOptions = useMemo(
    () => ({ value, type, fg, bg, size, level, logo }),
    [value, type, fg, bg, size, level, logo],
  );

  const set = <K extends keyof QrFields>(key: K, v: QrFields[K]) =>
    setFields((f) => ({ ...f, [key]: v }));

  const applyIntent = useCallback(
    (parsed: AiSpec) => {
      const validTypes: CodeType[] = ["url", "text", "wifi", "vcard", "whatsapp", "barcode"];
      const nextType = validTypes.includes(parsed.type as CodeType)
        ? (parsed.type as CodeType)
        : "text";
      setType(nextType);
      setFields((f) => ({ ...f, ...((parsed.fields ?? {}) as Partial<QrFields>) }));
      if (parsed.design?.fg) setFg(parsed.design.fg);
      if (parsed.design?.bg) setBg(parsed.design.bg);
      if (parsed.design?.size) setSize(Math.min(1024, Math.max(128, parsed.design.size)));
      if (parsed.design?.level) setLevel(parsed.design.level as ErrorLevel);
    },
    [],
  );

  const runPrompt = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) return;
      setBusy(true);
      try {
        const res = await parseIntentWithAI({ data: { prompt: q } });
        if (res.ok) {
          applyIntent(res.result);
          toast.success("Generated with Gemini");
          return;
        }
        throw new Error(res.error);
      } catch {
        const local = parseIntentLocally(q);
        applyIntent(local);
        toast.message(t.aiOffline, { description: local.note });
      } finally {
        setBusy(false);
      }
    },
    [applyIntent, t.aiOffline],
  );

  /* ---- WebMCP tool registration ---- */
  useEffect(() => {
    const tools = {
      generate_qr: async (args: { text: string; type?: CodeType }) => {
        const nextType = args.type ?? "text";
        setType(nextType);
        setFields((f) => ({ ...f, text: args.text, url: args.text, barcodeValue: args.text }));
        const canvas = document.createElement("canvas");
        await renderToCanvas(canvas, { ...options, value: args.text, type: nextType });
        return canvas.toDataURL("image/png");
      },
      generate_barcode: async (args: { value: string }) => {
        setType("barcode");
        set("barcodeValue", args.value);
        const canvas = document.createElement("canvas");
        await renderToCanvas(canvas, { ...options, value: args.value, type: "barcode" });
        return canvas.toDataURL("image/png");
      },
      parse_prompt: async (args: { prompt: string }) => {
        await runPrompt(args.prompt);
        return { applied: true };
      },
    };
    (window as unknown as Record<string, unknown>)["__WEBMCP_TOOLS__"] = tools;
    return () => {
      delete (window as unknown as Record<string, unknown>)["__WEBMCP_TOOLS__"];
    };
  }, [options, runPrompt]);

  /* ---- exports ---- */
  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    download(canvas.toDataURL("image/png"), `qr-${Date.now()}.png`);
  };

  const exportSvg = async () => {
    if (!value) return;
    const svg = await buildSvg(options);
    download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, `qr-${Date.now()}.svg`);
  };

  const exportPdf = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const w = 320;
    const h = (canvas.height / canvas.width) * w;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (595 - w) / 2, 160, w, h);
    pdf.save(`qr-${Date.now()}.pdf`);
  };

  const onLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result));
      setLevel("H");
    };
    reader.readAsDataURL(file);
  };

  const field = (key: keyof QrFields, label: string, placeholder = "") => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={String(fields[key])}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </div>
  );

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <QrCode className="size-5" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">{t.brand}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:inline-flex">
              <Bot className="size-3.5" /> {t.mcpReady}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              aria-label="Toggle language"
            >
              <Languages className="size-4" />
              {lang === "en" ? "AR" : "EN"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
            <span className="text-gradient">{t.heroTitle}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t.heroSub}
          </p>

          <div className="panel mt-8 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <Sparkles className="hidden size-5 shrink-0 text-primary sm:block sm:ms-2" />
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runPrompt(prompt);
              }}
              placeholder={t.aiPlaceholder}
              className="h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            />
            <Button
              className="h-11 shrink-0"
              disabled={busy || !prompt.trim()}
              onClick={() => void runPrompt(prompt)}
            >
              <Wand2 className="size-4" />
              {busy ? t.thinking : t.generate}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                  void runPrompt(s);
                }}
                className="rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Generator grid */}
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left */}
        <section className="panel p-5">
          <div className="mb-5 inline-flex rounded-xl border border-border bg-surface-2 p-1">
            {(["manual", "ai"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "manual" ? t.manual : t.aiMode}
              </button>
            ))}
          </div>

          {mode === "ai" ? (
            <div className="space-y-3">
              <Label htmlFor="ai-prompt">{t.aiMode}</Label>
              <Textarea
                id="ai-prompt"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.aiPlaceholder}
              />
              <Button
                className="w-full"
                disabled={busy || !prompt.trim()}
                onClick={() => void runPrompt(prompt)}
              >
                <Sparkles className="size-4" />
                {busy ? t.thinking : t.generate}
              </Button>
            </div>
          ) : null}

          <div className={mode === "ai" ? "mt-6 border-t border-border pt-6" : ""}>
            <Label className="mb-2 block">{t.type}</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    type === id
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t.types[id]}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {type === "url" && field("url", t.fields.url, "https://example.com")}
              {type === "text" && (
                <div className="space-y-2">
                  <Label htmlFor="text">{t.fields.text}</Label>
                  <Textarea
                    id="text"
                    rows={4}
                    value={fields.text}
                    onChange={(e) => set("text", e.target.value)}
                  />
                </div>
              )}
              {type === "wifi" && (
                <>
                  {field("wifiSsid", t.fields.wifiSsid, "Home")}
                  {field("wifiPassword", t.fields.wifiPassword, "••••••")}
                  <div className="space-y-2">
                    <Label>{t.fields.wifiEncryption}</Label>
                    <Select
                      value={fields.wifiEncryption}
                      onValueChange={(v) => set("wifiEncryption", v as QrFields["wifiEncryption"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA / WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">Open</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {type === "vcard" && (
                <>
                  {field("vcardName", t.fields.vcardName, "John Doe")}
                  {field("vcardOrg", t.fields.vcardOrg, "Acme Inc.")}
                  {field("vcardPhone", t.fields.vcardPhone, "+1 555 0142")}
                  {field("vcardEmail", t.fields.vcardEmail, "john@acme.com")}
                </>
              )}
              {type === "whatsapp" && (
                <>
                  {field("waPhone", t.fields.waPhone, "9647701234567")}
                  {field("waMessage", t.fields.waMessage, "Hi!")}
                </>
              )}
              {type === "barcode" && field("barcodeValue", t.fields.barcodeValue, "590123412345")}
            </div>
          </div>

          {/* Design controls */}
          <div className="mt-6 border-t border-border pt-6">
            <Label className="mb-3 block">{t.design}</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fg">{t.fg}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="fg"
                    type="color"
                    value={fg}
                    onChange={(e) => setFg(e.target.value)}
                    className="size-9 cursor-pointer rounded-md border border-border bg-transparent"
                  />
                  <Input value={fg} onChange={(e) => setFg(e.target.value)} className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bgc">{t.bg}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="bgc"
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="size-9 cursor-pointer rounded-md border border-border bg-transparent"
                  />
                  <Input value={bg} onChange={(e) => setBg(e.target.value)} className="h-9" />
                </div>
              </div>
              <div className="space-y-3">
                <Label>
                  {t.size}: {size}px
                </Label>
                <Slider
                  min={128}
                  max={1024}
                  step={32}
                  value={[size]}
                  onValueChange={([v]) => setSize(v ?? 512)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.level}</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as ErrorLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["L", "M", "Q", "H"] as ErrorLevel[]).map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>{t.logo}</Label>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  <Upload className="size-3.5" />
                  {t.upload}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onLogo(e.target.files?.[0])}
                  />
                </label>
                {logo ? (
                  <Button variant="ghost" size="sm" onClick={() => setLogo(null)}>
                    <X className="size-3.5" />
                    {t.clearLogo}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Right */}
        <section className="panel flex h-fit flex-col items-center gap-5 p-5 lg:sticky lg:top-24">
          <div className="flex w-full items-center justify-between">
            <Label>{t.preview}</Label>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {t.types[type]}
            </span>
          </div>

          <div
            className="flex w-full justify-center rounded-2xl border border-border p-5"
            style={{ backgroundColor: bg }}
          >
            {value ? (
              <CodeCanvas canvasRef={canvasRef} options={options} />
            ) : (
              <p className="py-16 text-center text-xs text-muted-foreground">{t.empty}</p>
            )}
          </div>

          <div className="w-full space-y-2">
            <Label>{t.payload}</Label>
            <pre className="max-h-32 overflow-auto rounded-lg border border-border bg-surface-2 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {value || "—"}
            </pre>
          </div>

          <div className="grid w-full grid-cols-3 gap-2">
            <Button variant="secondary" onClick={exportPng} disabled={!value}>
              <FileImage className="size-4" /> {t.png}
            </Button>
            <Button variant="secondary" onClick={() => void exportSvg()} disabled={!value}>
              <FileCode2 className="size-4" /> {t.svg}
            </Button>
            <Button variant="secondary" onClick={() => void exportPdf()} disabled={!value}>
              <FileText className="size-4" /> {t.pdf}
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Download className="size-3.5" /> {t.download}: PNG · SVG · PDF
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        {t.brand} · {t.mcpReady} ·{" "}
        <a href="/webmcp.json" className="underline decoration-primary/50 hover:text-foreground">
          webmcp.json
        </a>
      </footer>
    </div>
  );
}
