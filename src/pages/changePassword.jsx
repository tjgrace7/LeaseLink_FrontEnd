// NewPassword.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * NewPassword (UI-refactor)
 * ------------------------------------------------------------------
 * - Matches SignIn look/feel: card, labels, helper/error, focus rings
 * - Handles both recovery (temp session) and invite (auto signed-in)
 * - Client-side validation: length + match
 * - Show/Hide password, disabled/loading states, success banner
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

export default function NewPassword() {
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showPw2, setShowPw2] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState(""); // e.g., “You’re signed in via invite...”
    const navigate = useNavigate();
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const type = params.get("type"); // "recovery" or "invite"

        // If a code is present and we have no session yet, exchange it.
        (async () => {
            const { data: sessionRes } = await supabase.auth.getSession();
            if (!sessionRes.session && code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error("exchangeCodeForSession error:", error);
                    setError(error.message || "Your link may be invalid or expired.");
                    return;
                }
                // After successful exchange we’re signed in; show the UI hint:
                if (type === "recovery") setInfo("You’ve verified your email. Create a new password below.");
                if (type === "invite") setInfo("You’re signed in. Create a password to finish setup.");
            }
        })();
    }, []);


    // Detect arrival from recovery/invite
    useEffect(() => {
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            // When coming from the email link, event could be "PASSWORD_RECOVERY" or "SIGNED_IN"
            if (event === "PASSWORD_RECOVERY") {
                setInfo("You’ve verified your email. Create a new password below.");
            }
            if (event === "SIGNED_IN") {
                setInfo("You’re signed in. Create a password to finish setup.");
            }
        });
        return () => {
            sub.subscription.unsubscribe();
        };
    }, []);

    // Basic validators
    const tooShort = pw.length > 0 && pw.length < 8;
    const mismatch = pw && pw2 && pw !== pw2;

    const canSubmit = useMemo(() => {
        return pw.length >= 8 && pw2.length >= 8 && pw === pw2 && !isSubmitting;
    }, [pw, pw2, isSubmitting]);

    async function handleSetPassword(e) {
        e.preventDefault();
        setError("");
        if (!canSubmit) return;

        try {
            setIsSubmitting(true);
            const { error: updateErr } = await supabase.auth.updateUser({ password: pw });
            if (updateErr) throw updateErr;

            setDone(true);
            // Optional: sign them out then send to login for a clean auth start
            // await supabase.auth.signOut();
            // navigate("/login");
        } catch (err) {
            console.error(err);
            setError(err?.message || "Could not set password. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-black py-8 text-white md:py-12">
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8">
                <section aria-labelledby="newpw-heading">
                    <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-xl sm:p-8">
                        <header className="mb-6">
                            <h1 id="newpw-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Create your password
                            </h1>
                            <p className="mt-1 text-sm text-white/60">
                                {info || "For security, please set a new password to access your dashboard."}
                            </p>
                        </header>

                        {done && (
                            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                                Password set! You can now{" "}
                                <button
                                    onClick={async () => {
                                        // If they’re currently signed in (invite), send to dashboard; otherwise to login
                                        const { data } = await supabase.auth.getSession();
                                        if (data.session) navigate("/dashboard");
                                        else navigate("/login");
                                    }}
                                    className="font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                                >
                                    continue
                                </button>
                                .
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        {!done && (
                            <form onSubmit={handleSetPassword} noValidate className="space-y-5">
                                {/* New password */}
                                <div>
                                    <Label htmlFor="password">New password</Label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPw ? "text" : "password"}
                                            value={pw}
                                            onChange={(e) => setPw(e.target.value)}
                                            className={`${inputBase} pr-12`}
                                            placeholder="Create a password"
                                            required
                                            aria-invalid={tooShort}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw((s) => !s)}
                                            className="absolute inset-y-0 right-0 my-auto mr-2 inline-flex h-9 items-center rounded-lg px-3 text-xs text-white/70 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20"
                                            aria-pressed={showPw}
                                            aria-label={showPw ? "Hide password" : "Show password"}
                                        >
                                            {showPw ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    {tooShort ? (
                                        <ErrorText>Use at least 8 characters.</ErrorText>
                                    ) : (
                                        <HelperText>At least 8 characters. Use a mix of letters and numbers.</HelperText>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <Label htmlFor="password2">Confirm password</Label>
                                    <div className="relative">
                                        <input
                                            id="password2"
                                            type={showPw2 ? "text" : "password"}
                                            value={pw2}
                                            onChange={(e) => setPw2(e.target.value)}
                                            className={`${inputBase} pr-12`}
                                            placeholder="Re-enter your password"
                                            required
                                            aria-invalid={mismatch}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw2((s) => !s)}
                                            className="absolute inset-y-0 right-0 my-auto mr-2 inline-flex h-9 items-center rounded-lg px-3 text-xs text-white/70 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20"
                                            aria-pressed={showPw2}
                                            aria-label={showPw2 ? "Hide password" : "Show password"}
                                        >
                                            {showPw2 ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    {mismatch ? (
                                        <ErrorText>Passwords don’t match.</ErrorText>
                                    ) : (
                                        <HelperText>Re-enter to confirm.</HelperText>
                                    )}
                                </div>

                                {/* Submit */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={!canSubmit}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? "Saving…" : "Save password"}
                                    </button>
                                </div>

                                <p className="text-sm text-white/60">
                                    Having trouble with the link?{" "}
                                    <Link to="/forgot-password" className="text-emerald-400 hover:underline">
                                        Send a new reset email
                                    </Link>
                                    .
                                </p>
                            </form>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
