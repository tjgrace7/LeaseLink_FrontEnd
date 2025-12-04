import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import CalendlyInline from "../components/Calendly";


/**
 * RequestAccess (UI-refactor)
 * ------------------------------------------------------------------
 * - Mobile-first, responsive 1-col → 2-col layout
 * - Consistent Tailwind tokens, accessible labels, and helper text
 * - Basic client-side validation + disabled/loading states
 * - Error banner and subtle success transition (navigate on success)
 *
 * Notes:
 * - Keeps your existing Supabase tables: `access_requests`, `Testimonials`.
 * - Sanitizes numberOfTenants before submit; trims whitespace for strings.
 */

const inputBase =
  "block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-60";

const Label = ({ htmlFor, children, required }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1 inline-flex items-baseline gap-1 text-sm font-medium text-white/90"
  >
    {children}
    {required && (
      <span className="text-emerald-400" aria-hidden>
        *
      </span>
    )}
  </label>
);

const HelperText = ({ children }) => (
  <p className="mt-1 text-xs text-white/50">{children}</p>
);

const ErrorText = ({ children }) => (
  <p role="alert" className="mt-1 text-xs text-red-400">
    {children}
  </p>
);

const RequestAccess = () => {
  // -------------------- form state --------------------
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [numberOfUnits, setNumberOfUnits] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("")
  const [agree, setAgree] = useState(false); // NEW: must agree to policies


  const supabaseurl = import.meta.env.VITE_SUPABASE_URL;

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
    if (numberOfUnits === "") return false;
    const n = Number(numberOfUnits);
    return Number.isFinite(n) && n >= 0;
  }, [numberOfUnits]);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim() &&
      isEmailValid &&
      companyName.trim() &&
      isTenantsValid &&
      agree && // NEW: must agree
      !isSubmitting
    );
  }, [fullName, isEmailValid, companyName, isTenantsValid, agree, isSubmitting]);

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
        number_of_units: Number(numberOfUnits),
        message: message.trim() || null,
        PrivacyPolicy: agree
      };

      const { data, error } = await supabase.from("access_requests").insert(payload).select().single();
      if (error) throw error;
      console.log(data)


      if(code) {
        const response = await fetch(`${supabaseurl}/functions/v1/Site_Key_Access_Request`, {
        method:"POST",
        body: JSON.stringify({
          code,
          request_id: data.id
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error(" error:", result);
        return;
      }
      else 
        navigate('/check-email')
        return;
      }
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
    <>
      <title>Request Access | LeaseLink</title>
      <meta
        name="description"
        content="Request access to LeaseLink — AI lease extraction and search for commercial property managers."
      />
      <link rel="canonical" href="https://www.leaselink.ai/request" />
      {/* Optional social tags */}
      <meta property="og:title" content="Request Access | LeaseLink" />
      <meta property="og:description" content="Request access to LeaseLink." />
      <meta property="og:url" content="https://www.leaselink.ai/request" />
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
                  <Label htmlFor="phone">
                    Phone <span className="text-white/40">(Optional)</span>
                  </Label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputBase}
                    placeholder="(555) 555-5555"
                  />
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
                  <Label htmlFor="numberOfUnits" required>Estimated Number of Units</Label>
                  <input
                    id="numberOfUnits"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={numberOfUnits}
                    onChange={(e) => setNumberOfUnits(e.target.value)}
                    className={inputBase}
                    required
                  />
                  {!isTenantsValid && numberOfUnits !== "" && (
                    <ErrorText>Enter a non-negative number.</ErrorText>
                  )}
                </div>
                {/*Have an Access Code*/}
                <div>
                  <Label htmlFor='accesscode'>Do you have an Access Code?</Label>
                  <input
                  id="accesscode"
                  type="string"
                  value={code}
                  onChange={(e) => 
                  {
                    setCode(e.target.value)}}
                  className={inputBase}
                  />
                </div>
                {/* Message */}
                <div>
                  <Label htmlFor="message">
                    Tell us more <span className="text-white/40">(Optional)</span>
                  </Label>
                  <textarea
                    id="message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${inputBase} resize-y`}
                    placeholder="What problems are you hoping LeaseLink will solve?"
                  />
                </div>

                {/* Agree to policies */}
                <div className="pt-1">
                  <div className="flex items-start gap-3">
                    <input
                      id="agree"
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-400/60"
                      aria-invalid={!agree}
                      required
                    />
                    <Label htmlFor="agree" required>
                      <span>
                        I agree to the{" "}
                        <Link
                          to="/privacy_policy"
                          className="underline decoration-emerald-400/60 underline-offset-2 hover:text-emerald-300"
                        >
                          Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/terms"
                          className="underline decoration-emerald-400/60 underline-offset-2 hover:text-emerald-300"
                        >
                          Terms &amp; Conditions
                        </Link>
                        .
                      </span>
                    </Label>
                  </div>
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
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
              />
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
    </>
  );
};

export default RequestAccess;
