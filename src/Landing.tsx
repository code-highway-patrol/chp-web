import { Hero } from "./Hero";
import { ScrollScene } from "./ScrollScene";
import { HowItWorks } from "./HowItWorks";
import { Coverage } from "./Coverage";
import { Anatomy } from "./Anatomy";
import { Compare } from "./Compare";
import { CTA } from "./CTA";

export function Landing() {
  return (
    <>
      <Hero />
      <ScrollScene />
      <HowItWorks />
      <Coverage />
      <Anatomy />
      <Compare />
      <CTA />
    </>
  );
}
