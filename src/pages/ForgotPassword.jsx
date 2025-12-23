// ForgotPassword.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const inputBase =
  "block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-60";

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="mb-1 inline-block text-sm font-medium text-white/90">
    {children}
  </label>
);

const HelperText = ({ children }) => <p className="mt-1 text-xs text-white/50">{children}</p>;
const ErrorText = ({ children }) => <p role="alert" className="mt-1 text-xs text-red-400">{children}</p>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const supabaseURL = import.meta.env.VITE_SUPABASE_URL;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI states
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Confirm step
  const [confirming, setConfirming] = useState(false);

  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const canSubmit = useMemo(
    () => email.trim() && isEmailValid && !isSubmitting && !sent,
    [email, isEmailValid, isSubmitting, sent]
  );

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;

    // Step 1: ask for confirmation (same-page)
    if (!confirming) {
      if (!isEmailValid) {
        setError("Enter a valid email.");
        return;
      }
      setConfirming(true);
      return;
    }

    // Step 2: actually send reset email
    try {
      setIsSubmitting(true);

      // IMPORTANT:
      // This should be the route in your app that hosts the update-password screen
      // (or whatever page Supabase will redirect to after clicking the email link)
      // Example: https://www.leaselink.ai/update-password
      const redirectTo =
        `${window.location.origin}/check-email`;

      const response = await fetch(`${supabaseURL}/functions/v1/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            emailto: email.trim(),
    }
      )});

      console.log("Password reset response:", response);
      if (!response.ok) throw error;

      setSent(true);
      setConfirming(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not send reset email. Please try again.");
      setConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmail = () => {
    setConfirming(false);
    setSent(false);
    setError("");
  };

  return (
    <main className="min-h-screen bg-black py-8 text-white md:py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* Left: Form */}
        <section aria-labelledby="forgot-heading" className="order-1">
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-xl sm:p-8">
            <header className="mb-6">
              <h1 id="forgot-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Reset your password
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Enter your email and we’ll send you a password reset link.
              </p>
            </header>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {sent ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-200">
                    If an account exists for <span className="font-semibold text-white">{email.trim()}</span>,
                    you’ll receive a password reset email shortly.
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Check your inbox and spam folder. The link usually arrives within a minute.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 sm:w-auto"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={handleEditEmail}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 sm:w-auto"
                  >
                    Send to a different email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequest} noValidate className="space-y-5">
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      // if they edit while confirming, cancel confirm step
                      if (confirming) setConfirming(false);
                    }}
                    className={inputBase}
                    aria-invalid={!!email && !isEmailValid}
                    required
                    disabled={isSubmitting}
                  />
                  {!!email && !isEmailValid && <ErrorText>Enter a valid email.</ErrorText>}
                  <HelperText>Use the email associated with your LeaseLink account.</HelperText>
                </div>

                {/* Confirm step (same style as error banner, but neutral) */}
                {confirming && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                    Send a reset link to <span className="font-semibold text-white">{email.trim()}</span>?
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={!isEmailValid || isSubmitting}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {isSubmitting ? "Sending…" : "Yes, send link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit */}
                {!confirming && (
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continue
                    </button>
                  </div>
                )}

                <p className="text-sm text-white/60">
                  Remembered it?{" "}
                  <Link to="/signin" className="text-emerald-400 hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Right: Matching side panel */}
        <aside className="order-2 hidden lg:flex">
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold text-white">Quick + secure</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                We’ll email you a secure link to reset your password. If you don’t see it,
                check spam or try again with the email you used when signing up.
              </p>
              <div className="mt-6 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <p className="text-sm text-white/80">
                  Tip: Company admins can also confirm whether your account is active.
                </p>
                <p className="mt-2 text-xs text-white/60">
                  If your account is archived, you’ll need an admin to restore access.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default ForgotPassword;
