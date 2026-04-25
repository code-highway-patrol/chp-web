import { Hero } from "./Hero";
import { ScrollScene } from "./ScrollScene";
import { HowItWorks } from "./HowItWorks";
import { Features } from "./Features";
import { Compare } from "./Compare";
import { CTA } from "./CTA";

export function Landing() {
  return (
    <>
      <Hero />
      <ScrollScene />
      <HowItWorks />
      <Features />
      <Compare />
      <CTA />
    </>
  );
}
