import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_SAMPLES } from "@shared/sampleData";
import { buildSamplePrintHtml } from "./sampleExport";

describe("award sample PDF export", () => {
  it("builds an Arabic RTL report containing the award details and illustrative disclaimer", () => {
    const html = buildSamplePrintHtml(ILLUSTRATIVE_SAMPLES[0], "ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("تقرير نموذج جائزة توضيحي");
    expect(html).toContain("منصة المسار الأخضر");
    expect(html).toContain("نموذج توضيحي · ليس نتيجة حقيقية");
    expect(html).toContain("خفض استهلاك الموارد");
    expect(html).toContain("مؤشرات التقييم المرتبطة");
    expect(html).toContain("توقيع المقيم");
    expect(html).toContain("توقيع المعتمد");
    expect(html).toContain("class=\"signature-grid\"");
  });

  it("builds an English LTR report with escaped content", () => {
    const sample = { ...ILLUSTRATIVE_SAMPLES[0], name: { ...ILLUSTRATIVE_SAMPLES[0].name, en: "R&D <Pilot>" } };
    const html = buildSamplePrintHtml(sample, "en");
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Illustrative Award Sample Report");
    expect(html).toContain("R&amp;D &lt;Pilot&gt;");
    expect(html).toContain("aria-label=\"Mi&#039;yar logo\"");
    expect(html).toContain("Related evaluation metrics");
    expect(html).toContain("Evaluator signature");
    expect(html).toContain("Approver signature");
    expect(html).toContain("Illustrative sample · not a real result");
    expect(html).toContain("class=\"meta-grid\"");
  });
});
