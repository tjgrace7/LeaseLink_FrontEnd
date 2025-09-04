import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../components/AuthProvider";

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

const CreateCompanies = () => {
  const { session, roleData } = useAuth();
  const navigate = useNavigate();

  // Only Admins can access
  const isAdmin = !!roleData?.Is_LeaseLink_Admin;

  // form state
  const [companyName, setCompanyName] = useState("");
  const [memberStatus, setMemberStatus] = useState("New");
  const [claimedUnits, setClaimedUnits] = useState("");
  const [engagement, setEngagement] = useState("");
  const [notes, setNotes] = useState("");

  // ui state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // derived validation
  const canSubmit = useMemo(() => {
    return companyName.trim() && !isSubmitting && isAdmin;
  }, [companyName, isSubmitting, isAdmin]);

  const goBack = () => {
    // If the page is accessible without auth, the back button still works.
    navigate(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        company_name: companyName.trim(),
        member_status: memberStatus,
        ClaimedNumUnits: claimedUnits === "" ? null : Number(claimedUnits),
        customer_engagement_elavator: engagement.trim() || null,
        // optional: store notes in a text column if you have one, else remove
        notes: notes.trim() || null,
      };

      const { error } = await supabase
        .from("Property_Management_Companies")
        .insert(payload);

      if (error) throw error;

      // Success → return to dashboard (or navigate to the new company if you have that route)
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Could not create company. Please check your inputs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not admin? Show an in-page notice (no redirect)
  if (session && !isAdmin) {
    return (
      <main className="min-h-screen bg-black py-8 text-white md:py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              ← Back
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-semibold">Create Company</h1>
            <p className="mt-2 text-white/70">
              You don’t have permission to access this page. Contact an administrator if this is a mistake.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black py-8 text-white md:py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* Left: form */}
        <section className="order-2 lg:order-1">
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-xl sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create Company</h1>
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                ← Back
              </button>
            </div>
            <p className="mb-4 text-sm text-white/60">
              Add a new Property Management Company. Approved access requests on the dashboard also create companies automatically.
            </p>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

              {/* Member Status */}
              <div>
                <Label htmlFor="memberStatus" required>Member Status</Label>
                <select
                  id="memberStatus"
                  value={memberStatus}
                  onChange={(e) => setMemberStatus(e.target.value)}
                  className={`${inputBase} pr-10`}
                  required
                >
                  <option value="New">New</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <HelperText>Choose the starting state for this customer.</HelperText>
              </div>

              {/* ClaimedNumUnits */}
              <div>
                <Label htmlFor="claimedUnits">Claimed Number of Units</Label>
                <input
                  id="claimedUnits"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={claimedUnits}
                  onChange={(e) => setClaimedUnits(e.target.value)}
                  className={inputBase}
                  placeholder="e.g., 250"
                />
                <HelperText>Optional. You can update this later.</HelperText>
              </div>


              {/* Notes (optional) */}
              <div>
                <Label htmlFor="notes">Notes <span className="text-white/40">(Optional)</span></Label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputBase} resize-y`}
                  placeholder="Any extra context for the team."
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating…" : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right: lightweight help / hint */}
        <aside className="order-1 flex items-stretch lg:order-2">
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="flex h-full flex-col justify-center">
              <h2 className="text-xl font-semibold">Tips</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
                <li><span className="font-medium">New</span> is a good default; switch to <span className="font-medium">Active</span> after onboarding.</li>
                <li><span className="font-medium">Claimed Units</span> helps forecast upload/chat costs.</li>
                <li>Approved access requests on the dashboard already create a company automatically.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default CreateCompanies;
