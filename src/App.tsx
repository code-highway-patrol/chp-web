import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { GetStartedModal } from "./GetStartedModal";
import { Landing } from "./Landing";
import { MarketplacePage } from "./marketplace/MarketplacePage";
import { StatueDetailPage } from "./marketplace/StatueDetailPage";
import { NewStatuePage } from "./marketplace/NewStatuePage";
import { SignInPage } from "./auth/SignInPage";
import { AuthCallbackPage } from "./auth/AuthCallbackPage";

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/new" element={<NewStatuePage />} />
        <Route path="/marketplace/:slug" element={<StatueDetailPage />} />
        <Route path="/auth" element={<SignInPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
      <Footer />
      <GetStartedModal />
    </BrowserRouter>
  );
}
