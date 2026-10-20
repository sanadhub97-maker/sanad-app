import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AlertsRibbonView } from "../src/components/layout/alerts-ribbon";
import type { AlertsRibbonSettings, RibbonItem } from "../src/api/alerts";

const settings: AlertsRibbonSettings = { enabled: true, speed: 70, direction: "rtl", skin: "black", height: "regular", fontSize: 13, chips: "pill", categories: { expired: true, soon: true, tasks: true, violations: true, tax: false }, maxItems: 12, pauseOnHover: true, showCount: true, showDue: true, showAllClear: true };
const item = (over: Partial<RibbonItem>): RibbonItem => ({ key: "k", cat: "expired", title: "إقامة - أحمد", date: "2026-10-08", days: -12, href: "/employees/e1", ...over });
const html = (s: AlertsRibbonSettings, items: RibbonItem[]) => renderToStaticMarkup(<MemoryRouter><AlertsRibbonView settings={s} items={items} /></MemoryRouter>);

describe("alerts ribbon", () => {
  it("shows each item as a link, with the count, and the speed and look from the settings", () => {
    const out = html({ ...settings, speed: 40, skin: "ivory", height: "large" }, [item({}), item({ key: "k2", cat: "soon", title: "السجل التجاري", days: 6, date: "2026-10-26" })]);
    expect(out).toContain('href="/employees/e1"');
    expect(out).toContain("إقامة - أحمد");
    expect(out).toContain("--ar-spd:40s");
    expect(out).toContain("--ar-h:62px");
    expect(out).toContain('data-skin="ivory"');
    expect(out).toContain('<span class="ar-cnt">2</span>');
  });
  it("hides the count and the due text when switched off", () => {
    const out = html({ ...settings, showCount: false, showDue: false }, [item({})]);
    expect(out).not.toContain("ar-cnt");
    expect(out).not.toContain("ar-due");
  });
  it("shows the all-clear message when there is nothing to carry", () => {
    const out = html(settings, []);
    expect(out).toContain("كل الوثائق والتراخيص سارية");
    expect(out).not.toContain("ar-cnt");
  });
});
