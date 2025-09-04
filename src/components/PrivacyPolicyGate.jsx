// components/PolicyGate.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthProvider";

const PolicyGate = () => {
  const { session, userData, setUserData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const [privacy, setPrivacy] = useState(null); // { id, policy }
  const [terms, setTerms] = useState(null);     // { id, terms }

  const [ackPrivacy, setAckPrivacy] = useState(false);
  const [ackTerms, setAckTerms] = useState(false);

  const [acceptedNow, setAcceptedNow] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchOne = async (table, selectCols) => {
      let { data } = await supabase
        .from(table)
        .select(selectCols)
        .eq("isCurrent", true)
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from(table)
          .select(selectCols)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (res.error) throw res.error;
        data = res.data?.[0] ?? null;
      }
      return data;
    };

    const run = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      setError("");
      try {
        const [p, t] = await Promise.all([
          fetchOne("PrivacyPolicies", "id, policy, isCurrent"),
          fetchOne("Terms&Conditions", "id, terms, isCurrent"),
        ]);
        if (mounted) {
          setPrivacy(p ?? null);
          setTerms(t ?? null);
        }
      } catch (e) {
        if (mounted) setError(e.message ?? "Failed to load policies.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => { mounted = false; };
  }, [session?.user?.id]);

  const needsPrivacy = useMemo(() => {
    if (!privacy || !userData) return false;
    return !userData?.PrivacyPolicy || userData?.accepted_policy_id !== privacy.id;
  }, [privacy, userData]);

  const needsTerms = useMemo(() => {
    if (!terms || !userData) return false;
    return !userData?.TermsAccepted || userData?.accepted_terms_id !== terms.id;
  }, [terms, userData]);

  const shouldGate = useMemo(() => {
    if (!session) return false;
    if (userData === undefined) return false;
    if (acceptedNow) return false;
    return needsPrivacy || needsTerms;
  }, [session, userData, acceptedNow, needsPrivacy, needsTerms]);

  useEffect(() => {
    if (shouldGate) {
      document.body.classList.add("overflow-hidden");
      return () => document.body.classList.remove("overflow-hidden");
    }
  }, [shouldGate]);

  const canAccept = useMemo(() => {
    const needP = needsPrivacy ? ackPrivacy : true;
    const needT = needsTerms ? ackTerms : true;
    return needP && needT && !accepting;
  }, [needsPrivacy, needsTerms, ackPrivacy, ackTerms, accepting]);

  const accept = async () => {
    if (!session?.user?.id) return;
    setAccepting(true);
    setError("");
    try {
      const acceptedAt = new Date().toISOString();
      const patch = {};

      if (needsPrivacy && privacy?.id) {
        patch.PrivacyPolicy = true;
        patch.accepted_policy_id = privacy.id;
        patch.accepted_policy_at = acceptedAt;
      }
      if (needsTerms && terms?.id) {
        patch.TermsAccepted = true;
        patch.accepted_terms_id = terms.id;
        patch.accepted_terms_at = acceptedAt;
      }

      if (Object.keys(patch).length) {
        const { error: uerr } = await supabase
          .from("User_Data")
          .update(patch)
          .eq("auth_id", session.user.id);
        if (uerr) throw uerr;

        if (typeof setUserData === "function") {
          setUserData(prev => ({ ...(prev ?? {}), ...patch }));
        }
      }

      setAcceptedNow(true);
      setAckPrivacy(false);
      setAckTerms(false);
    } catch (e) {
      setError(e.message ?? "Could not save acceptance");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || !session) return null;
  if (!shouldGate) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4">
      {/* Card is flex-col with a hard max height tied to viewport (dvh handles mobile URL bar) */}
      <div className="relative w-full max-w-5xl mx-auto rounded-2xl bg-white text-black shadow-2xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col">
        {/* Header (shrink) */}
        <div className="px-6 pt-5 shrink-0">
          <h2 className="text-xl font-semibold">Review & Accept</h2>
          <p className="text-sm text-gray-600">
            Please review the documents below and accept to continue.
          </p>
        </div>

        {/* Scrollable middle content */}
        <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto">
          {/* Privacy */}
          {privacy && (
            <section className="flex min-h-0 flex-col">
              <h3 className="font-semibold mb-2">
                Privacy Policy {needsPrivacy ? "*" : ""}
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: privacy.policy }}
                />
              </div>
              {needsPrivacy ? (
                <label className="mt-3 flex items-center gap-3 text-sm shrink-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={ackPrivacy}
                    onChange={(e) => setAckPrivacy(e.target.checked)}
                  />
                  I have read and agree to the Privacy Policy.
                </label>
              ) : (
                <p className="mt-3 text-xs text-emerald-700 shrink-0">Already accepted.</p>
              )}
            </section>
          )}

          {/* Terms */}
          {terms && (
            <section className="flex min-h-0 flex-col">
              <h3 className="font-semibold mb-2">
                Terms &amp; Conditions {needsTerms ? "*" : ""}
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: terms.terms }}
                />
              </div>
              {needsTerms ? (
                <label className="mt-3 flex items-center gap-3 text-sm shrink-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={ackTerms}
                    onChange={(e) => setAckTerms(e.target.checked)}
                  />
                  I have read and agree to the Terms &amp; Conditions.
                </label>
              ) : (
                <p className="mt-3 text-xs text-emerald-700 shrink-0">Already accepted.</p>
              )}
            </section>
          )}
        </div>

        {error && (
          <div className="px-6 pb-2 shrink-0">
            <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
          </div>
        )}

        {/* Footer (pinned) */}
        <div className="px-6 pb-5 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
          {privacy && (
            <button
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => window.open("/privacy", "_blank")}
            >
              Open Privacy
            </button>
          )}
          {terms && (
            <button
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => window.open("/terms", "_blank")}
            >
              Open Terms
            </button>
          )}
          <button
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 inline-flex items-center gap-2"
            onClick={accept}
            disabled={!canAccept}
            aria-busy={accepting ? "true" : "false"}
          >
            {accepting ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving…
              </>
            ) : (
              "Accept & Continue"
            )}
          </button>
        </div>

        {accepting && (
          <div className="absolute inset-0 rounded-2xl bg-white/60 flex items-center justify-center">
            <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="sr-only">Saving…</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyGate;
