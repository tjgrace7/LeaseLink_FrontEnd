import { motion } from "framer-motion";
import { Building2, FileUp, MessageSquare, BookOpenCheck, ArrowRight, CheckCircle, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from '../assets/Lease_Link_Logo.png'

// Dark-mode first design (Tailwind). Uses framer-motion & lucide-react only.
// Drop this as src/pages/Home.jsx and route to it.

export default function HomePage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/70 backdrop-blur border-b border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              className=" h-16 w-16text-neutral-200" />

          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <a href="#story" className="hover:text-white">Our Story</a>
            <a href="#how" className="hover:text-white">How it Works</a>
            <a href="#proof" className="hover:text-white">Why Lease Link</a>
          </nav>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm rounded-xl hover:bg-neutral-900" onClick={() => navigate('/login')}>Login</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500" onClick={() => navigate('/request')}>Request a Demo</button>
            <a
              href="https://calendly.com/jtaylor-leaselink"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500"
            >
              Book a Call
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white"
            >
              Built by Commercial Property Managers,
              <span className="block">for Commercial Property Managers.</span>
            </motion.h1>
            <p className="mt-6 text-lg text-neutral-300 max-w-xl">
              Lease Link was born out of frustration. Managing over $100M in commercial real estate, we wasted years hunting through leases for answers that should have been at our fingertips. We built Lease Link to solve that problem — and now it’s helping property managers everywhere do the same.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">

              <button className="px-6 py-3 border border-neutral-800 rounded-xl hover:bg-neutral-900">Talk to a Specialist</button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-neutral-400">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> SOC 2-ready practices</div>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4" /></div>
            </div>
          </div>

          {/* Glassy preview card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:justify-self-end w-full max-w-xl"
          >
            <div className="rounded-3xl shadow-xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="grid grid-cols-3 gap-4">
                {["Upload", "Ask", "Citations"].map((label, idx) => (
                  <div key={idx} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 flex flex-col items-center gap-2">
                    {idx === 0 && <FileUp className="h-6 w-6 text-neutral-200" />}
                    {idx === 1 && <MessageSquare className="h-6 w-6 text-neutral-200" />}
                    {idx === 2 && <BookOpenCheck className="h-6 w-6 text-neutral-200" />}
                    <span className="text-sm font-medium text-neutral-200">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm text-neutral-300">
                  “What are the CAM charge caps and renewal options for Suite 210?”
                </p>
                <div className="mt-3 text-xs text-neutral-400">
                  Answer: CAM cap at 5% annually; 2× 5-year renewals. <span className="underline">See source (p. 14, 27)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="bg-neutral-950 border-t border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">How it works</h2>
            <p className="mt-3 text-neutral-300">Simple, powerful workflow that mirrors how you already manage leases — just faster.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upload */}
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl p-3 bg-neutral-800/70">
                  <FileUp className="h-6 w-6 text-neutral-200" />
                </div>
                <div>
                  <h3 className="font-medium text-lg text-white">Upload Your Leases</h3>
                  <p className="mt-1 text-neutral-300 text-sm">
                    Store and organize all lease-related documents in one secure platform. Bulk upload and automatic tenant/property tagging keep everything tidy.
                  </p>
                </div>
              </div>
            </div>

            {/* Ask */}
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl p-3 bg-neutral-800/70">
                  <MessageSquare className="h-6 w-6 text-neutral-200" />
                </div>
                <div>
                  <h3 className="font-medium text-lg text-white">Ask Any Question</h3>
                  <p className="mt-1 text-neutral-300 text-sm">
                    From CAM charges to escalation clauses and renewal options—get instant, plain‑English answers across all leases.
                  </p>
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl p-3 bg-neutral-800/70">
                  <BookOpenCheck className="h-6 w-6 text-neutral-200" />
                </div>
                <div>
                  <h3 className="font-medium text-lg text-white">See the Source</h3>
                  <p className="mt-1 text-neutral-300 text-sm">
                    Every answer is backed by page‑level citations for total confidence. Click to jump straight to the clause.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof / Benefits */}
      <section id="proof" className="bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">Why teams choose Lease Link</h2>
              <ul className="mt-6 space-y-4">
                {[
                  "Hours of manual searching reduced to seconds",
                  "Complex clauses summarized in plain English",
                  "Role-based access and audit-friendly traceability",
                  "Secure storage with enterprise-grade controls",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 mt-0.5 text-neutral-200" />
                    <span className="text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl shadow-lg border border-neutral-800 bg-neutral-900 p-6">
              <div className="text-sm text-neutral-300">
                <p className="italic">“We used to spend days combing through leases. Now answers are instant and defensible. It’s changed how our team works.”</p>
                <p className="mt-3 font-medium text-neutral-200">— Regional Property Manager</p>
              </div>
              <div className="mt-6 grid sm:grid-cols-3 gap-4 text-center">
                {[
                  { label: "Leases analyzed", value: "100M+ sq ft" },
                  { label: "Avg. response time", value: "< 2 sec" },
                  { label: "Data accuracy", value: "Cited" },
                ].map((stat, i) => (
                  <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                    <div className="text-2xl font-semibold text-white">{stat.value}</div>
                    <div className="text-xs text-neutral-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative bg-neutral-950 border-t border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">Manage 100+ commercial units?</h2>
              <p className="mt-3 text-neutral-300 max-w-xl">
                If you’re a property manager with over 100 commercial units, see how we can save you years of time. Bring your hardest leases—we’ll show you the receipts.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500" onClick={() => navigate('/request')}>Request a Demo</button>
                          <a
              href="https://calendly.com/jtaylor-leaselink"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500"
            >
              Book a Call
            </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 text-neutral-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <img
                src={logo}
                className=" h-16 w-16text-neutral-200" />

            </div>
            <p className="mt-3 text-sm text-neutral-400 max-w-xs">Instant, cited answers from your lease universe.</p>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-400">
              <li><a href="#how" className="hover:text-white">How it Works</a></li>
              <li><a href="#proof" className="hover:text-white">Why Lease Link</a></li>
              <li><a href="#cta" className="hover:text-white">ROI</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-400">
              <li><a href="#story" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Security</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Get Started</div>
            <p className="mt-3 text-sm text-neutral-400">Ready to see it? We’ll tailor a demo to your portfolio.</p>
            <div className="mt-4">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500" onClick={() => navigate('/request')}>Request a Demo</button>
            </div>
          </div>
        </div>
        <div className="border-top border-neutral-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-xs text-neutral-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Lease Link</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-neutral-300">Privacy</a>
              <a href="#" className="hover:text-neutral-300">Terms</a>
            </div>
          </div>
        </div>
      </footer >
    </div >
  );
}