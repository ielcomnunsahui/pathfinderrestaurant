import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Benefits } from "@/components/landing/Benefits";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";


function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Benefits />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default Index;
