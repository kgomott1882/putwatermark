"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Download, Droplet, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type Step = {
  number: string;
  title: string;
  description: string;
  Icon: LucideIcon;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Upload",
    description: "Drop in a photo or video, right from your device.",
    Icon: Upload,
  },
  {
    number: "02",
    title: "Watermark",
    description: "Add your text or logo. Adjust it live.",
    Icon: Droplet,
  },
  {
    number: "03",
    title: "Export",
    description: "Download instantly. Pay only to remove the mark.",
    Icon: Download,
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current,
        {
          opacity: 0,
          y: 40,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.2,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            once: true,
          },
        },
      );
    }, sectionRef);

    return () => {
      context.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full bg-mist px-6 py-24 text-ink sm:px-12 lg:px-20"
    >
      <div className="w-full">
        <div className="w-full text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-steel">
            No download. No installation.
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink md:text-6xl">
            How it works
          </h2>
        </div>

        <div className="mt-14 grid w-full gap-6 md:grid-cols-3 lg:gap-10">
          {steps.map(({ number, title, description, Icon }, index) => (
            <div
              key={title}
              ref={(element) => {
                cardsRef.current[index] = element;
              }}
              className="relative overflow-hidden rounded-lg bg-paper p-8 text-left shadow-xl shadow-ink/5"
            >
              <span className="absolute right-5 top-2 text-8xl font-bold tracking-[-0.08em] text-mist/70">
                {number}
              </span>
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist text-signal">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-steel">
                  Step {number}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-ink">{title}</h3>
                <p className="mt-3 leading-7 text-steel">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
