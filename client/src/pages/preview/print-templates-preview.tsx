import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, FileText, Printer } from "lucide-react";
import { PRINT_CONCEPTS, PRINT_KINDS, printDocument, type PrintKind } from "./print-template-documents";
import "./print-templates-preview.css";

function Paper({ index, kind, thumbnail = false, frameRef }: { index: number; kind: PrintKind; thumbnail?: boolean; frameRef?: React.RefObject<HTMLIFrameElement | null> }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(thumbnail ? .25 : .8);
  const html = useMemo(() => printDocument(index, kind), [index, kind]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(entry.contentRect.width / 794, thumbnail ? 1 : 1.15)));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [thumbnail]);
  return <div ref={container} className="pt-paper-holder" style={{ height: 1123 * scale }}><iframe ref={frameRef} title={`${PRINT_CONCEPTS[index].name} — ${kind}`} srcDoc={html} loading={thumbnail ? "lazy" : "eager"} sandbox="allow-same-origin allow-modals" tabIndex={thumbnail ? -1 : 0} style={{ transform: `scale(${scale})` }} /></div>;
}

export default function PrintTemplatesPreview() {
  const [params, setParams] = useSearchParams();
  const selected = Math.max(0, PRINT_CONCEPTS.findIndex(t => t.id === params.get("template")));
  const kind = PRINT_KINDS.some(k => k.id === params.get("kind")) ? params.get("kind") as PrintKind : "report";
  const frame = useRef<HTMLIFrameElement>(null);
  const theme = PRINT_CONCEPTS[selected];
  const choose = (index: number, nextKind = kind) => setParams({ template: PRINT_CONCEPTS[index].id, kind: nextKind }, { replace: true });
  useEffect(() => { document.title = "سند — معرض قوالب الطباعة"; }, []);
  return <div className="pt-gallery" dir="rtl">
    <header className="pt-header"><a href="/login" className="pt-logo"><span>س</span><b>سند<small>PRINT COLLECTION / 2026</small></b></a><a className="pt-back" href="/login">العودة للنظام <ArrowLeft size={15} /></a></header>
    <section className="pt-intro"><div><span className="pt-eyebrow">تفاصيل تستحق أن تُطبع.</span><h1>هوية واحدة.<br/><em>عشرة أساليب للتعبير عنها.</em></h1><p>مجموعة قوالب عربية صُممت للتقارير وملفات الموظفين والسندات.<br/>اختر التصميم، واستعرض تفاصيله على ورقة A4.</p></div><div className="pt-edition"><strong>10</strong><span>قوالب طباعة<br/>ثلاثة أنواع من المستندات</span></div></section>
    <div className="pt-workspace">
      <aside className="pt-selection"><div className="pt-section-label"><h2>اختر قالبك</h2><span>01 — 10</span></div><div className="pt-template-grid">{PRINT_CONCEPTS.map((t,i) => <button key={t.id} className={`pt-template ${selected === i ? "selected" : ""}`} onClick={() => choose(i)} aria-pressed={selected === i}><div className="pt-thumbnail"><Paper index={i} kind="report" thumbnail /><span className="pt-selection-check">{selected === i ? <Check size={13}/> : String(i+1).padStart(2,"0")}</span></div><div className="pt-template-name"><b>{t.name}</b><span style={{ background: t.color }} /></div><small>{t.english}</small></button>)}</div></aside>
      <section className="pt-preview"><div className="pt-preview-toolbar"><div><span className="pt-eyebrow">القالب {String(selected+1).padStart(2,"0")}</span><h2>{theme.name} <small>{theme.english}</small></h2><p>{theme.description}</p></div><button className="pt-print" onClick={() => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }}><Printer size={16}/>طباعة النموذج</button></div><div className="pt-document-tabs" aria-label="نوع المستند">{PRINT_KINDS.map(k => <button key={k.id} onClick={() => choose(selected,k.id)} aria-pressed={kind === k.id} className={kind === k.id ? "active" : ""}><FileText size={14}/>{k.name}</button>)}</div><div className="pt-canvas"><div className="pt-paper-meta"><span>A4 · 210 × 297 mm</span><span>معاينة ببيانات تجريبية</span></div><Paper index={selected} kind={kind} frameRef={frame}/></div><div className="pt-preview-footer"><button disabled={selected === 0} onClick={() => choose(selected-1)}><ChevronRight size={16}/>السابق</button><span>{selected+1} / 10</span><button disabled={selected === 9} onClick={() => choose(selected+1)}>التالي<ChevronLeft size={16}/></button></div><p className="pt-hint">للطباعة المطابقة للمعاينة: اختر A4، واضبط المقياس على 100%، وفعّل رسومات الخلفية، وأوقف ترويسات المتصفح. النماذج للمعاينة وليست مستندات معتمدة.</p></section>
    </div><footer className="pt-footer"><b>سند / مجموعة الطباعة</b><span>ترويسات مدروسة · جداول مقروءة · مساحات للتوقيع والختم</span></footer>
  </div>;
}
