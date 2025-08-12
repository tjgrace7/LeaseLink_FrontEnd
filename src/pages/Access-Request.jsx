import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * RequestAccess (UI-refactor)
 * ------------------------------------------------------------------
 * - Mobile-first, responsive 1-col → 2-col layout
 * - Consistent Tailwind tokens, accessible labels, and helper text
 * - Basic client-side validation + disabled/loading states
 * - Error banner and subtle success transition (navigate on success)
 * - Testimonial block with graceful loading fallback
 *
 * Notes:
 * - Keeps your existing Supabase tables: `access_requests`, `Testimonials`.
 * - Sanitizes numberOfTenants before submit; trims whitespace for strings.
 * - If you prefer shadcn/ui, we can swap inputs later with minimal diff.
 */

const inputBase =
  "block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-60";

const Label = ({ htmlFor, children, required }) => (
  <label htmlFor={htmlFor} className="mb-1 inline-flex items-baseline gap-1 text-sm font-medium text-white/90">
    {children}
    {required && <span className="text-emerald-400" aria-hidden>*</span>}
  </label>
);

const HelperText = ({ children }) => (
  <p className="mt-1 text-xs text-white/50">{children}</p>
);

const ErrorText = ({ children }) => (
  <p role="alert" className="mt-1 text-xs text-red-400">{children}</p>
);

const RequestAccess = () => {
  // -------------------- form state --------------------
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [numberOfTenants, setNumberOfTenants] = useState("");
  const [message, setMessage] = useState("");

  // -------------------- ui state ----------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [testimonial, setTestimonial] = useState(null);

  const navigate = useNavigate();

  // -------------------- testimonials ------------------
  useEffect(() => {
    let cancelled = false;
    const getTestimonies = async () => {
      const { data, error } = await supabase.from("Testimonials").select("*");
      if (!cancelled && !error && Array.isArray(data) && data.length) {
        const num = Math.floor(Math.random() * data.length);
        setTestimonial(data[num]);
      }
    };
    getTestimonies();
    return () => {
      cancelled = true;
    };
  }, []);

  // Basic derived validation states (extend as needed)
  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const isTenantsValid = useMemo(() => {
    if (numberOfTenants === "") return false;
    const n = Number(numberOfTenants);
    return Number.isFinite(n) && n >= 0;
  }, [numberOfTenants]);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim() &&
      isEmailValid &&
      companyName.trim() &&
      isTenantsValid &&
      !isSubmitting
    );
  }, [fullName, isEmailValid, companyName, isTenantsValid, isSubmitting]);

  // -------------------- submit handler ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company_name: companyName.trim(),
        number_of_tenants: Number(numberOfTenants),
        message: message.trim() || null,
      };

      const { error } = await supabase.from("access_requests").insert(payload);
      if (error) throw error;

      // Navigate to thank-you screen on success
      navigate("/thank-you");
    } catch (err) {
      console.error(err);
      setError("There was a problem submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black py-8 text-white md:py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* ------------------ Left: Request Form ------------------ */}
        <section aria-labelledby="request-access-heading" className="order-2 lg:order-1">
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-xl sm:p-8">
            <header className="mb-6">
              <h1 id="request-access-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Request Access
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Tell us about your company and we’ll follow up shortly.
              </p>
            </header>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" required>Full Name</Label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputBase}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" required>Email</Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                  aria-invalid={!isEmailValid}
                  required
                />
                {!isEmailValid && email && <ErrorText>Enter a valid email.</ErrorText>}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">Phone <span className="text-white/40">(Optional)</span></Label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputBase}
                  placeholder="(555) 555-5555"
                />
                <HelperText>We’ll only use this if email bounces.</HelperText>
              </div>

              {/* Company Name */}
              <div>
                <Label htmlFor="companyName" required>Company Name</Label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={inputBase}
                  required
                />
              </div>

              {/* Number of Tenants */}
              <div>
                <Label htmlFor="numberOfTenants" required>Estimated Number of Tenants</Label>
                <input
                  id="numberOfTenants"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={numberOfTenants}
                  onChange={(e) => setNumberOfTenants(e.target.value)}
                  className={inputBase}
                  required
                />
                {!isTenantsValid && numberOfTenants !== "" && (
                  <ErrorText>Enter a non-negative number.</ErrorText>
                )}
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message">Tell us more <span className="text-white/40">(Optional)</span></Label>
                <textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${inputBase} resize-y`}
                  placeholder="What problems are you hoping LeaseLink will solve?"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ------------------ Right: Testimonial ------------------ */}
        <aside className="order-1 flex items-stretch lg:order-2">
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
            {/* Accent gradient */}
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

            {testimonial ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <blockquote className="text-balance text-xl italic leading-relaxed text-white sm:text-2xl">
                  “{testimonial.Message}”
                </blockquote>
                <figcaption className="mt-6 text-sm font-medium text-white/80">
                  @{testimonial.User_Handle}
                </figcaption>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                <p className="mt-2 text-sm text-white/50">Loading testimonial…</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
};

export default RequestAccess;