"use client";

import {
  LandingCta,
  LandingHighlight,
  LandingSectionHeader,
  LandingSubSeparator,
} from "../landing/LandingPrimitives";
import { pageContainerClass } from "../pageContainer";
import { aboutPageIntro, aboutSections } from "@/lib/aboutContent";

export function AboutPageContent() {
  return (
    <>
      <section className="landing-section border-b">
        <div className={pageContainerClass}>
          <LandingSectionHeader
            index="About"
            lead={
              <>
                {aboutPageIntro.lead}{" "}
                <LandingHighlight>{aboutPageIntro.highlight}</LandingHighlight>
              </>
            }
            title="Built to be used, not sold to."
          />

          <LandingSubSeparator className="mt-14" />

          <div className="mt-12 grid gap-px landing-border border bg-beige/10 lg:grid-cols-2">
            {aboutSections.map((section) => (
              <article className="bg-night-card p-6 sm:p-8" key={section.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sand">
                  {section.title}
                </h3>
                <div className="mt-5 space-y-4">
                  {section.body.map((paragraph) => (
                    <p className="text-sm leading-7 text-beige-dim" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <LandingSubSeparator className="mt-14" />

          <div className="mt-12 grid gap-px landing-border border bg-beige/10 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="bg-night-card p-8">
              <p className="landing-muted text-sm leading-7">
                Upload a file, add your watermark, and export in minutes.{" "}
                <LandingHighlight>No signup required to try it</LandingHighlight> — see
                the result first, then decide if you need credits for higher volume.
              </p>
            </div>
            <div className="flex items-center justify-center bg-night-card p-8">
              <LandingCta href="/watermark">Open the editor</LandingCta>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
