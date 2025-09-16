// This component is an optimized version of the LinkedIn landing page.
// It addresses several issues surfaced by Google PageSpeed Insights:
//  • Adds a canonical link via react‑helmet to improve SEO.
//  • Lazy loads the video embed and image assets to avoid render‑blocking resources on
//    mobile devices.
//  • Uses React.Suspense with a lightweight fallback to defer loading of the
//    heavy Vimeo component until it is needed.

import React, { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Helmet lets us declaratively manage the document head. By specifying a
// canonical URL we ensure search engines understand that this page is
// distinct from the root domain, resolving the rel=canonical issue reported
// by PageSpeed Insights. 
import logo from '../assets/Lease_Link_Logo.png';
import { useEffect } from "react";

function usePageHead({ title, description, canonical }) {
  useEffect(() => {
    // Title
    if (title) document.title = title;

    // Description
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }

    // Canonical (origin + pathname, no query/hash unless you pass one)
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }
  }, [title, description, canonical]);
}

// Dynamically import the video component so it only loads when needed. This
// reduces the amount of JavaScript downloaded on initial page load, improving
// performance scores on mobile.
const VideoEmbed = lazy(() => import('../components/VideoEmbed'));

const LinkedInLanding = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    units: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Handle submission of the access request form. This function includes
  // lightweight validation and uses dynamic import of supabaseClient to
  // eliminate unnecessary code from the initial bundle. Supabase is only
  // loaded once the user attempts to submit the form.
  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (!form.name || !form.email || !form.company || !form.units || !form.phone) {
      setErr('Please fill in all required fields.');
      return;
    }
    const unitsNum = Number(form.units);
    if (Number.isNaN(unitsNum) || unitsNum < 1) {
      setErr('Units must be a valid number.');
      return;
    }

    setLoading(true);
    try {
      // Import supabase on demand. This avoids loading the client on page
      // render, which helps reduce unused JavaScript in the main bundle.
      const { supabase } = await import('../supabaseClient');
      const { error } = await supabase.from('access_request').insert({
        full_name: form.name,
        email: form.email,
        phone: form.phone,
        company_name: form.company,
        number_of_units: unitsNum,
        message: form.notes || null,
      });
      if (error) throw error;
      navigate('/thank-you');
    } catch (e) {
      console.error(e);
      setErr("We couldn't submit your request automatically. You can try again, or continue to the next page.");
      navigate('/thank-you');
    } finally {
      setLoading(false);
    }
  }
  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://leaselink.ai/";

  usePageHead({
    title: "LeaseLink — Built by Commercial Property Managers",
    description:
      "Upload leases, ask questions, and get instant answers. Save hours each week with LeaseLink.",
    canonical,
  });
  return (
    <>
      {/* Set the canonical URL for the page. Without this, search engines may
          assume the page is canonicalized to the root domain. */}
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Top bar / brand */}
        <header className="mx-auto w-full max-w-6xl px-4 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-emerald-500/20 ring-1 ring-cyan-400/30 flex items-center justify-center">
                {/* Use lazy loading for the logo image so it doesn’t block
                    rendering on slower connections. */}
                <img
                  src={logo}
                  alt="Lease Link logo"
                  width={64}
                  height={64}
                  decoding="async"
                  fetchpriority="high"
                  loading="lazy"
                  className="h-12 w-12 md:h-14 md:w-14 rounded-lg object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">LeaseLink</h1>
                <p className="text-xs text-white/60">Built by Commercial Property Managers</p>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto mt-8 w-full max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                Efficiently Manage Your <span className="text-emerald-500">Leases</span>
              </h2>
              <p className="mt-3 text-white/80">
                Upload leases. Ask questions. Get instant answers. Save hours every week.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  Answer Tenant Questions in Minutes.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  Extract key terms, dates, options, and charges in seconds.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  Built for teams managing 100+ units.
                </li>
              </ul>
            </div>

            {/* Video section: wrap in Suspense and lazy load */}
            <div>
              <Suspense
                fallback={
                  <div className="w-full aspect-video rounded-2xl bg-slate-800/50 animate-pulse" />
                }
              >
                <VideoEmbed mode='click' videoId={1118917826} poster={logo}/>
              </Suspense>
              <p className="mt-2 text-xs text-white/50">Demo video: See LeaseLink in action.</p>
            </div>
          </div>
        </section>

        {/* CTA / Access Request form */}
        <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16">
          <div className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
              <h3 className="text-xl font-semibold">Request Access</h3>
              <p className="mt-1 text-sm text-white/70">
                We’re inviting <span className="font-medium text-emerald-500">5 commercial property managers</span> to try
                LeaseLink for free. You must manage <span className="font-medium text-emerald-500">100+ units</span>.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm text-white/70">
                      Full Name*
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={onChange}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white placeholder-white/30 outline-none ring-1 ring-transparent focus:ring-cyan-400"
                      placeholder="Jane Smith"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm text-white/70">
                      Work Email*
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={onChange}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white placeholder-white/30 outline-none ring-1 ring-transparent focus:ring-cyan-400"
                      placeholder="jane@company.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className="block text-sm text-white/70">
                      Phone*
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={onChange}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white placeholder-white/30 outline-none ring-1 ring-transparent focus:ring-cyan-400"
                      placeholder="(555) 555-5555"
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label htmlFor="units" className="block text-sm text-white/70">
                      Units Managed*
                    </label>
                    <input
                      id="units"
                      name="units"
                      type="number"
                      min={1}
                      required
                      value={form.units}
                      onChange={onChange}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white placeholder-white/30 outline-none ring-1 ring-transparent focus:ring-cyan-400"
                      placeholder="e.g., 150"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm text-white/70">
                    Company*
                  </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      required
                      value={form.company}
                      onChange={onChange}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white placeholder-white/30 outline-none ring-1 ring-transparent focus:ring-cyan-400"
                      placeholder="Acme Property Management"
                      autoComplete="organization"
                    />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm text-white/70">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white placeholder-white/30 outline-none ring-1 ring-transparent focus:ring-cyan-400"
                    placeholder="Any specific needs or questions?"
                  />
                </div>
                {err && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {err}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                  >
                    {loading ? 'Submitting…' : 'Get Access'}
                  </button>
                  <p className="text-xs text-white/50">No credit card required • Limited beta</p>
                </div>
              </form>
            </div>
            <aside className="md:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-semibold">Why LeaseLink?</h4>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                  <li>Find lease answers fast</li>
                  <li>Cut response times to tenants</li>
                  <li>Reduce manual reading & errors</li>
                  <li>Secure, role-based access</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-semibold">Great for</h4>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                  <li>Commercial PM teams</li>
                  <li>Portfolios 100+ units</li>
                  <li>Multi-tenant properties</li>
                  <li>Non-Residential Commercial Property Managers</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
};

export default LinkedInLanding;