import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, FileText, Printer } from "lucide-react";
import { PRINT_KINDS, type PrintKind } from "./print-template-documents";
import { DESIGNS } from "./print-design-catalog";
const PRINT_CONCEPTS = DESIGNS.map(d => ({ id: d.id.startsWith("studio_") ? d.id.slice(7) : `legacy_${d.id}`, themeId: d.id, name: d.nameAr.replace(" — مجموعة الطباعة", ""), english: d.nameEn.replace(" — Print Collection", ""), color: d.accent, description: d.descAr }));
import "./print-templates-preview.css";
import { toast } from "sonner";

function Paper({ index, kind, thumbnail = false, frameRef, onReady }: { index: number; kind: PrintKind; thumbnail?: boolean; frameRef?: React.RefObject<HTMLIFrameElement | null>; onReady?: (key: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(thumbnail ? .25 : .8);
  const [height, setHeight] = useState(1123);
  const source = `/print-samples/${PRINT_CONCEPTS[index].themeId}-${kind}.html`;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(entry.contentRect.width / 794, thumbnail ? 1 : 1.15)));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [thumbnail]);
  return <div ref={container} className="pt-paper-holder" style={{ height: (thumbnail ? 1123 : height) * scale }}><iframe ref={frameRef} title={`${PRINT_CONCEPTS[index].name} — ${kind}`} src={source} onLoad={async event => {
    if (thumbnail) return;
    const iframe = event.currentTarget;
    const document = iframe.contentDocument;
    if (!document) return;
    const fontsReady = await Promise.race([
      document.fonts.ready.then(() => true),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000)),
    ]);
    if (iframe.contentDocument !== document || !document.URL.endsWith(source)) return;
    if (!fontsReady) {
      iframe.contentWindow?.stop();
      toast.info("تعذر تحميل بعض الخطوط؛ المعاينة تستخدم الخط المتاح على جهازك.");
    }
    // Reset before measuring so a tall previous document cannot inflate a short one.
    iframe.style.height = "1123px";
    setHeight(Math.max(1123, document.documentElement.scrollHeight, document.body.scrollHeight));
    onReady?.(`${index}:${kind}`);
  }} loading={thumbnail ? "lazy" : "eager"} sandbox="allow-same-origin allow-modals" tabIndex={thumbnail ? -1 : 0} style={{ height: thumbnail ? 1123 : height, transform: `scale(${scale})` }} /></div>;
}

export default function PrintTemplatesPreview() {
  const [params, setParams] = useSearchParams();
  const selected = Math.max(0, PRINT_CONCEPTS.findIndex(t => t.id === params.get("template")));
  const kind = PRINT_KINDS.some(k => k.id === params.get("kind")) ? params.get("kind") as PrintKind : "report";
  const frame = useRef<HTMLIFrameElement>(null);
  const [readyKey, setReadyKey] = useState("");
  useLayoutEffect(() => { setReadyKey(""); }, [selected, kind]);
  const ready = readyKey === `${selected}:${kind}`;
  const theme = PRINT_CONCEPTS[selected];
  const choose = (index: number, nextKind = kind) => setParams({ template: PRINT_CONCEPTS[index].id, kind: nextKind }, { replace: true });
  useEffect(() => { document.title = "سند — معرض قوالب الطباعة"; }, []);
  return <div className="pt-gallery" dir="rtl">
    <header className="pt-header"><a href="/login" className="pt-logo"><span>س</span><b>سند<small>PRINT COLLECTION / 2026</small></b></a><a className="pt-back" href="/login">العودة للنظام <ArrowLeft size={15} /></a></header>
    <section className="pt-intro"><div><span className="pt-eyebrow">تفاصيل تستحق أن تُطبع.</span><h1>هوية واحدة.<br/><em>كل قوالبك في معرض واحد.</em></h1><p>مجموعة قوالب عربية صُممت للتقارير وملفات الموظفين والسندات.<br/>اختر التصميم، واستعرض تفاصيله على ورقة A4.</p></div><div className="pt-edition"><strong>{PRINT_CONCEPTS.length}</strong><span>قوالب طباعة<br/>ثلاثة أنواع من المستندات</span></div></section>
    <div className="pt-workspace">
      <aside className="pt-selection"><div className="pt-section-label"><h2>اختر قالبك</h2><span>01 — {PRINT_CONCEPTS.length}</span></div><div className="pt-template-grid">{PRINT_CONCEPTS.map((t,i) => <button key={t.id} className={`pt-template ${selected === i ? "selected" : ""}`} onClick={() => choose(i)} aria-pressed={selected === i}><div className="pt-thumbnail"><Paper index={i} kind="report" thumbnail /><span className="pt-selection-check">{selected === i ? <Check size={13}/> : String(i+1).padStart(2,"0")}</span></div><div className="pt-template-name"><b>{t.name}</b><span style={{ background: t.color }} /></div><small>{t.english}</small></button>)}</div></aside>
      <section className="pt-preview"><div className="pt-preview-toolbar"><div><span className="pt-eyebrow">القالب {String(selected+1).padStart(2,"0")}</span><h2>{theme.name} <small>{theme.english}</small></h2><p>{theme.description}</p></div><button className="pt-print" disabled={!ready} onClick={() => { try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); } catch { toast.error("تعذر فتح نافذة الطباعة. أعد تحميل المعاينة وحاول مجددًا."); } }}><Printer size={16}/>{ready ? "طباعة النموذج" : "جاري تحميل النموذج…"}</button></div><div className="pt-document-tabs" aria-label="نوع المستند">{PRINT_KINDS.map(k => <button key={k.id} onClick={() => choose(selected,k.id)} aria-pressed={kind === k.id} className={kind === k.id ? "active" : ""}><FileText size={14}/>{k.name}</button>)}</div><div className="pt-canvas"><div className="pt-paper-meta"><span>A4 · 210 × 297 mm</span><span>معاينة ببيانات تجريبية</span></div><Paper index={selected} kind={kind} frameRef={frame} onReady={setReadyKey}/></div><div className="pt-preview-footer"><button disabled={selected === 0} onClick={() => choose(selected-1)}><ChevronRight size={16}/>السابق</button><span>{selected+1} / {PRINT_CONCEPTS.length}</span><button disabled={selected === PRINT_CONCEPTS.length - 1} onClick={() => choose(selected+1)}>التالي<ChevronLeft size={16}/></button></div><p className="pt-hint">للطباعة المطابقة للمعاينة: اختر A4، واضبط المقياس على 100%، وفعّل رسومات الخلفية، وأوقف ترويسات المتصفح. النماذج للمعاينة وليست مستندات معتمدة.</p></section>
    </div><footer className="pt-footer"><b>سند / مجموعة الطباعة</b><span>ترويسات مدروسة · جداول مقروءة · مساحات للتوقيع والختم</span></footer>
  </div>;
}
