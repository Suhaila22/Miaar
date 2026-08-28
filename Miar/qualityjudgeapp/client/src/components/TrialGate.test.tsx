import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialGate } from "./TrialGate";

describe("TrialGate", () => {
  it("renders the Arabic exhausted-state title, explanation, and contact CTA", () => {
    const html = renderToStaticMarkup(
      <TrialGate
        title="انتهت الفترة التجريبية المجانية (5 محاولات)"
        description="لقد استنفدت المحاولات المتاحة. يرجى التواصل معنا للاشتراك."
        contactLabel="تواصل معنا للاشتراك"
        contactHref="mailto:soso22083@gmail.com?subject=Subscription%20Inquiry"
        dir="rtl"
      />
    );

    expect(html).toContain("انتهت الفترة التجريبية المجانية (5 محاولات)");
    expect(html).toContain("لقد استنفدت المحاولات المتاحة");
    expect(html).toContain("تواصل معنا للاشتراك");
    expect(html).toContain("mailto:soso22083@gmail.com?subject=Subscription%20Inquiry");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("<form");
    expect(html).toContain("name@example.com");
    expect(html).toContain("Send");
  });

  it("renders the English CTA in left-to-right mode", () => {
    const html = renderToStaticMarkup(
      <TrialGate
        title="Free Trial Limit Reached (5 Attempts)"
        description="Please contact us to subscribe."
        contactLabel="Contact Us to Subscribe"
        contactHref="mailto:soso22083@gmail.com"
      />
    );

    expect(html).toContain("Free Trial Limit Reached (5 Attempts)");
    expect(html).toContain("Contact Us to Subscribe");
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("<textarea");
    expect(html).toContain("mailto:soso22083@gmail.com");
  });
});
