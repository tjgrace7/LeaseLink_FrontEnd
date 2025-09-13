import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../components/AuthProvider";
import { GTMSignIn } from "../components/gtag";

/**
 * SignIn (UI-refactor)
 * ------------------------------------------------------------------
 * - Mobile-first, responsive 1-col → 2-col (testimonial on lg+)
 * - Accessible labels, helper/error text, focus outlines
 * - Email format check, disabled/loading states, error banner
 * - Safe useEffects with proper dependency arrays & unmount guards
 * - Blocks sign-in if User_Data.archived is true
 */

const inputBase =
  "block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-60";

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="mb-1 inline-block text-sm font-medium text-white/90">
    {children}
  </label>
);

const HelperText = ({ children }) => <p className="mt-1 text-xs text-white/50">{children}</p>;
const ErrorText = ({ children }) => <p role="alert" className="mt-1 text-xs text-red-400">{children}</p>;

// Interpret boolean-like values safely
const isTrueish = (v) => {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "t" || s === "1" || s === "yes";
  }
  return Boolean(v);
};

const SignIn = () => {
  // -------------------- auth state --------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -------------------- ui state ----------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testimonial, setTestimonial] = useState(null);

  const navigate = useNavigate();
  const { session } = useAuth();

  // If already signed in, reroute (but avoid racing while submitting)
  useEffect(() => {
    if (session && !isSubmitting) navigate("/dashboard");
  }, [session, isSubmitting, navigate]);

  // Load one random testimonial
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

  // Simple validators
  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const canSubmit = useMemo(
    () => email.trim() && isEmailValid && password && !isSubmitting,
    [email, isEmailValid, password, isSubmitting]
  );

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);

      // 1) Attempt auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // 2) Check archived flag in User_Data for this auth user
      const authId = data?.user?.id;
      if (authId) {
        const { data: userRow, error: userErr } = await supabase
          .from("User_Data")
          .select("archived")
          .eq("auth_id", authId)
          .maybeSingle();

        if (!userErr && isTrueish(userRow?.archived)) {
          // Block sign-in: immediately sign out & show message
          GTMSignIn(false)
          await supabase.auth.signOut();
          setError("Your account is archived. Please contact your company admin.");
          return; // do not navigate
        }
      }
      GTMSignIn(true)
      // 3) Proceed normally
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      GTMSignIn(false)
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black py-8 text-white md:py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* ------------------ Left: Sign In Form ------------------ */}
        <section aria-labelledby="signin-heading" className="order-1 lg:order-1">
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-xl sm:p-8">
            <header className="mb-6">
              <h1 id="signin-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-white/60">Sign in to continue to your dashboard.</p>
            </header>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} noValidate className="space-y-5">
              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                  aria-invalid={!!email && !isEmailValid}
                  required
                />
                {!!email && !isEmailValid && <ErrorText>Enter a valid email.</ErrorText>}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputBase} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 my-auto mr-2 inline-flex h-9 items-center rounded-lg px-3 text-xs text-white/70 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                  <HelperText>Use your work email if possible.</HelperText>
                  <Link to="/forgot-password" className="text-emerald-400 hover:underline">Forgot password?</Link>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </button>
              </div>

              {/* CTA */}
              <p className="text-sm text-white/60">
                Don’t have an account?{" "}
                <Link to="/request" className="text-emerald-400 hover:underline">
                  Book a demo
                </Link>
              </p>
            </form>

            {/* --- Mobile testimonial (compact) --- */}
            <figure className="mt-6 block lg:hidden">
              {testimonial ? (
                <blockquote className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white">
                  “{testimonial.Message}”
                </blockquote>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-white/10" />
                </div>
              )}
              {testimonial && (
                <figcaption className="mt-2 text-right text-xs text-white/70">
                  @{testimonial.User_Handle}
                </figcaption>
              )}
            </figure>
          </div>
        </section>

        {/* ------------------ Right: Testimonial ------------------ */}
        <aside className="order-2 hidden lg:order-2 lg:flex">
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
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

export default SignIn;
