import { useState, useEffect } from "react";
import { Building2, FileUp, MessageSquare, BookOpenCheck, ArrowRight, CheckCircle, Shield, Zap, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Lease_Link_Logo.png";

// Move SEO operations to useEffect to avoid blocking render
function Seo({ title, description }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description]);
  
  return null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Seo
        title="Lease Link — AI Lease Answers for Commercial Property Managers"
        description="Lease Link provides instant, cited answers from your lease universe. Upload leases, ask questions, and get page-level citations."
      />

      {/* Header - Simplified */}
      <header className="sticky top-0 z-40 bg-neutral-950/70 backdrop-blur border-b border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="Lease Link logo"
              width={48}
              height={48}
              className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-contain"
              loading="eager"
              fetchpriority="high"
            />
            <span className="hidden sm:block truncate text-sm text-neutral-300">
              Instant, cited answers from your lease universe
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <a href="#story" className="hover:text-white">Our Story</a>
            <a href="#how" className="hover:text-white">How it Works</a>
            <a href="#proof" className="hover:text-white">Why Lease Link</a>
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm rounded-xl hover:bg-neutral-900"
              onClick={() => go("/login")}
            >
              Login
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500"
              onClick={() => go("/request")}
            >
              Request a Demo
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-neutral-900"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu - No animations for now */}
        {open && (
          <div className="md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
              <nav className="grid gap-2 text-sm">
                <a href="#story" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-900">Our Story</a>
                <a href="#how" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-900">How it Works</a>
                <a href="#proof" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-900">Why Lease Link</a>
              </nav>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button className="px-4 py-2 rounded-xl hover:bg-neutral-900" onClick={() => go("/login")}>
                  Login
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500" onClick={() => go("/request")}>
                  Request a Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero - NO ANIMATIONS for LCP */}
      <section className="relative overflow-hidden" id="story">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-24 grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <div>
            {/* This is your LCP element - keep it simple */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              Built by Commercial Property Managers,
              <span className="block">for Commercial Property Managers.</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-neutral-300 max-w-xl">
              Lease Link was born out of frustration. Managing over $100M in commercial real estate, we wasted years hunting through leases for answers that should have been at our fingertips. We built Lease Link to solve that problem — and now it's helping property managers everywhere do the same.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                className="px-6 py-3 border border-neutral-800 rounded-xl hover:bg-neutral-900 w-full sm:w-auto"
                onClick={() => go("/request")}
              >
                Talk to a Specialist
              </button>
            </div>
            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-4 text-sm text-neutral-400">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> SOC 2-ready practices</div>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4" /> Fast, cited answers</div>
            </div>
          </div>

          {/* Preview card - simplified */}
          <div className="lg:justify-self-end w-full max-w-xl">
            <div className="rounded-3xl shadow-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {["Upload", "Ask", "Citations"].map((label, idx) => (
                  <div key={idx} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3 sm:p-4 flex flex-col items-center gap-2">
                    {idx === 0 && <FileUp className="h-6 w-6 text-neutral-200" />}
                    {idx === 1 && <MessageSquare className="h-6 w-6 text-neutral-200" />}
                    {idx === 2 && <BookOpenCheck className="h-6 w-6 text-neutral-200" />}
                    <span className="text-xs sm:text-sm font-medium text-neutral-200">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 sm:mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4">
                <p className="text-sm text-neutral-300">
                  "What are the CAM charge caps and renewal options for Suite 210?"
                </p>
                <div className="mt-3 text-xs text-neutral-400">
                  Answer: CAM cap at 5% annually; 2× 5-year renewals. <span className="underline">See source (p. 14, 27)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rest of sections - you can add animations back here later */}
      <section id="how" className="bg-neutral-950 border-t border-neutral-800">
        {/* Keep existing content but remove motion components */}
      </section>

      {/* Add other sections without animations initially */}
    </div>
  );
}