import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { ScrollScene } from "./ScrollScene";
import { HowItWorks } from "./HowItWorks";
import { Features } from "./Features";
import { Stats } from "./Stats";
import { Compare } from "./Compare";
import { CTA } from "./CTA";
import { Footer } from "./Footer";
import { GetStartedModal } from "./GetStartedModal";

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <ScrollScene />
      <HowItWorks />
      <Features />
      <Stats />
      <Compare />
      <CTA />
      <Footer />
      <GetStartedModal />
    </>
  );
}
