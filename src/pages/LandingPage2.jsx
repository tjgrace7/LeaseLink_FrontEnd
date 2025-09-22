// LinkedInLanding.jsx
import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Lease_Link_Logo.png";
import { GTMLead } from "../components/gtag";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import CalendlyInline from '../components/Calendly';

function usePageHead({ title, description, canonical }) {
    useEffect(() => {
        if (title) document.title = title;
        if (description) {
            let meta = document.querySelector('meta[name="description"]');
            if (!meta) {
                meta = document.createElement("meta");
                meta.setAttribute("name", "description");
                document.head.appendChild(meta);
            }
            meta.setAttribute("content", description);
        }
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

const VideoEmbed = lazy(() => import("../components/VideoEmbed"));

const LinkedInLanding2 = () => {
    const navigate = useNavigate();
    const { executeRecaptcha } = useGoogleReCaptcha();

    // spam + attribution helpers
    const [formStartedAt, setFormStartedAt] = useState(0);
    const [honeypot, setHoneypot] = useState("");
    const startedOnce = useRef(false);

    useEffect(() => {
        const onFirstInteract = () => {
            if (!startedOnce.current) {
                startedOnce.current = true;
                setFormStartedAt(Date.now());
            }
        };
        window.addEventListener("pointerdown", onFirstInteract, { once: true });
        window.addEventListener("keydown", onFirstInteract, { once: true });
        return () => {
            window.removeEventListener("pointerdown", onFirstInteract);
            window.removeEventListener("keydown", onFirstInteract);
        };
    }, []);

    const getUTM = () => {
        const p = new URLSearchParams(window.location.search);
        const keys = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "gclid",
            "fbclid",
            "li_fat_id",
        ];
        const out = {};
        keys.forEach((k) => {
            if (p.get(k)) out[k] = p.get(k);
        });
        return out;
    };

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        units: "",
        notes: "",
    });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!form.name || !form.email || !form.company || !form.units || !form.phone) {
            setErr("Please fill in all required fields.");
            return;
        }
        const unitsNum = Number(form.units);
        if (Number.isNaN(unitsNum) || unitsNum < 1) {
            setErr("Units must be a valid number.");
            return;
        }

        if (!executeRecaptcha) {
            setErr("reCAPTCHA is not ready yet. Please try again.");
            return;
        }

        setLoading(true);
        try {
            const recaptchaToken = await executeRecaptcha("access_request");

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        phone: form.phone,
                        company: form.company,
                        message: form.notes || "",
                        units: unitsNum,
                        source: "Marketing Form",
                        utm: getUTM(),
                        honeypot,
                        form_started_at: formStartedAt || Date.now(),
                        recaptchaToken,
                        recaptchaAction: "access_request",
                    }),
                }
            );

            if (!res.ok) {
                const t = await res.text().catch(() => "");
                throw new Error(t || `HTTP ${res.status}`);
            }
            const body = await res.json().catch(() => ({}));
            if (body?.ok === false) {
                throw new Error("We could not verify you as human. Please try again.");
            }

            if (unitsNum >= 100) {
                GTMLead();
            }

            navigate("/thank-you");
            await sleep(300);
        } catch (e) {
            console.error(e);
            navigate("/thank-you");
            setErr(
                "We couldn't submit your request automatically. You can try again, or continue to the next page."
            );
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
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Header */}
            <header className="mx-auto w-full max-w-6xl px-4 pt-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl bg-emerald-500/20 ring-1 ring-cyan-400/30 flex items-center justify-center">
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
                            <p className="text-xs text-white/60">
                                Built by Commercial Property Managers
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="mx-auto mt-8 w-full max-w-6xl px-4">
                <div className="grid gap-8 md:grid-cols-2">
                    <div className="flex flex-col justify-center">
                        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                            Your <span className="text-emerald-500">Leasing</span> Assistant
                        </h2>
                        <p className="mt-3 text-white/80">
                            Upload your leases, amendments, and documents — then get instant,
                            accurate answers with citations.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-white/80">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                Answer tenant and team questions in minutes, not hours.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                Extract key terms, dates, options, and charges.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                Save dozens of hours every month across your portfolio.
                            </li>
                        </ul>
                    </div>

                    <div>
                        <Suspense
                            fallback={
                                <div className="w-full aspect-video rounded-2xl bg-slate-800/50 animate-pulse" />
                            }
                        >
                            <VideoEmbed />
                        </Suspense>
                        <p className="mt-2 text-xs text-white/50">
                            Demo video: See LeaseLink in action.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA form */}
            <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16">
                <div className="grid gap-8 md:grid-cols-5">

                    <div className="md:col-span-3 w-full aspect-video bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                        <CalendlyInline />
                    </div>
                    {/* Sidebar */}
                    <aside className="md:col-span-2 space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h4 className="font-semibold">Why LeaseLink?</h4>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                                <li>Instant clarity — Get lease answers in seconds, not hours.</li>
                                <li>
                                    Happier tenants — Respond to questions right away and build
                                    trust.
                                </li>
                                <li>
                                    Error-proof decisions — Eliminate manual reading and missed
                                    details.
                                </li>
                                <li>
                                    Built for teams — Secure, role-based access across your
                                    portfolio.
                                </li>
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h4 className="font-semibold">Great for</h4>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                                <li>Commercial Property Management Teams</li>
                                <li>Portfolios 100+ units</li>
                                <li>Multi-tenant Retail & Office Properties</li>
                                <li>Non-Residential Commercial Property Managers</li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
};

export default LinkedInLanding2;
