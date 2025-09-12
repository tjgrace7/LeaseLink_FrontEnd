import { supabase } from "../supabaseClient";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const [policy, setPolicy] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("PrivacyPolicies")
        .select("*")
        .eq("isCurrent", true)
        .single();

      if (error) {
        console.error("Error Fetching Privacy Policy", error);
      } else if (data?.policy) {
        setPolicy(data.policy);
      }
    })();
  }, []);

  const renderPolicy = () => {
    if (!policy) return null;

    return policy.split("\n").map((line, i) => {
      const trimmed = line.trim();

      if (!trimmed) return <div key={i} className="h-4" />;

      if (/^[A-Z\s]{4,}$/.test(trimmed)) {
        return (
          <h2 key={i} className="text-xl font-bold text-emerald-400 mt-8 mb-4">
            {trimmed}
          </h2>
        );
      }
      if (/^\d+(\.|\))/i.test(trimmed)) {
        return (
          <h3 key={i} className="text-lg font-semibold text-emerald-300 mt-6 mb-2">
            {trimmed}
          </h3>
        );
      }

      return (
        <p key={i} className="text-base leading-relaxed text-gray-200 mb-4">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <>
      <title>Privacy Policy | LeaseLink</title>
      <meta name="robots" content="noindex, follow" />
      <meta
        name="description"
        content="Learn how LeaseLink collects, uses, and protects your data."
      />
      <meta property="og:title" content="Privacy Policy | LeaseLink" />
      <meta property="og:description" content="LeaseLink's privacy practices." />
      <meta property="og:url" content="https://www.leaselink.ai/privacy_policy" />
      <div className="min-h-screen bg-[#222] text-white flex items-start justify-center px-6 py-12">

        <div className="max-w-3xl w-full">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold mb-8 text-center text-emerald-400">
            Privacy Policy
          </h1>
          <div className="prose prose-invert">{renderPolicy()}</div>
        </div>
      </div>
    </>
  );
};

export default Privacy;
