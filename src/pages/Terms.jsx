import { supabase } from "../supabaseClient";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
  const [terms, setTerms] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("Terms&Conditions") // exact table name as provided
        .select("terms")
        .eq("isCurrent", true)
        .single();

      if (error) {
        console.error("Error fetching Terms & Conditions", error);
        setErrorMsg("We couldn’t load the Terms & Conditions right now.");
      } else {
        setTerms(data?.terms ?? "");
      }
    })();
  }, []);

  // Render text with simple heading detection
  const renderTerms = () => {
    if (!terms) return null;

    return terms.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-4" />;

      // ALL-CAPS lines -> H2
      if (/^[A-Z\s]{4,}$/.test(trimmed)) {
        return (
          <h2 key={i} className="text-xl font-bold text-emerald-400 mt-8 mb-4">
            {trimmed}
          </h2>
        );
      }
      // Numbered section lines -> H3
      if (/^\d+(\.|\))/i.test(trimmed)) {
        return (
          <h3 key={i} className="text-lg font-semibold text-emerald-300 mt-6 mb-2">
            {trimmed}
          </h3>
        );
      }
      // Paragraph
      return (
        <p key={i} className="text-base leading-relaxed text-gray-200 mb-4">
          {trimmed}
        </p>
      );
    });
  };

  return (
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
          Terms &amp; Conditions
        </h1>

        {errorMsg ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
            {errorMsg}
          </div>
        ) : (
          <div className="prose prose-invert">{renderTerms()}</div>
        )}
      </div>
    </div>
  );
};

export default TermsAndConditions;
