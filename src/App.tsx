import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { ScrollScene } from "./ScrollScene";
import { HowItWorks } from "./HowItWorks";
import { Features } from "./Features";
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
      <Compare />
      <CTA />
      <Footer />
      <GetStartedModal />
    </>
  );
}
