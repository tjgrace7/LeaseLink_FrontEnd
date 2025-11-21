import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DisplayBox from "../components/DisplayBox";
import { useAuth } from "../components/AuthProvider"; // optional, but here if you need it later

const IntegrationsResponsePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth(); // not used yet, but handy if you later gate content

  const provider = searchParams.get("provider") || "";
  const errorParam = searchParams.get("error") || "";
  const connected = searchParams.get("connected") === "1"; // query params are strings

  const providerLabel = useMemo(() => {
    if (provider === "microsoft") return "Microsoft 365 / Outlook";
    if (provider === "google") return "Gmail / Google Workspace";
    return "Email Provider";
  }, [provider]);

  // Derive what to show based on error / connected
  const { title, description, tone } = useMemo(() => {
    if (errorParam) {
      // map backend error codes to friendly copy
      switch (errorParam) {
        case "consent_failed":
          return {
            title: `We couldn't connect to ${providerLabel}`,
            description:
              "It looks like you closed the consent window or denied access. To finish connecting, please try again and accept the requested permissions.",
            tone: "error",
          };
        case "missing_code":
          return {
            title: "Missing authorization code",
            description:
              "We didn't receive the authorization code from your provider. Please start the connection process again.",
            tone: "error",
          };
        case "bad_state":
          return {
            title: "Sign-in session expired",
            description:
              "The security state for this connection is no longer valid (for example, the tab was open for a long time). Please restart the integration from the settings page.",
            tone: "error",
          };
        case "me_fetch_failed":
          return {
            title: "Mailbox profile could not be read",
            description:
              "We connected to your provider, but couldn't read your mailbox profile. This may be a temporary issue or a permissions problem. Please try again or contact support if it persists.",
            tone: "error",
          };
        default:
          return {
            title: "Something went wrong",
            description:
              `The provider returned an error: "${errorParam}". Please try again in a moment, and if the issue continues, contact support with this message.`,
            tone: "error",
          };
      }
    }

    if (connected) {
      return {
        title: `Connected to ${providerLabel}`,
        description:
          "Your mailbox is now linked to LeaseLink. We’re starting the initial sync in the background — emails may take a few minutes to appear in search.",
        tone: "success",
      };
    }

    // Neutral / fallback state (no error, not connected)
    return {
      title: "Email integration status",
      description:
        "Use this page to review the result of your email integration. You can always restart the connection from the Integrations section in Settings.",
      tone: "info",
    };
  }, [errorParam, connected, providerLabel]);

  const toneClasses = useMemo(() => {
    switch (tone) {
      case "success":
        return {
          badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
          icon: "✅",
          title: "text-emerald-100",
        };
      case "error":
        return {
          badge: "bg-red-500/20 text-red-200 border-red-500/40",
          icon: "⚠️",
          title: "text-red-100",
        };
      default:
        return {
          badge: "bg-sky-500/20 text-sky-100 border-sky-500/40",
          icon: "ℹ️",
          title: "text-white",
        };
    }
  }, [tone]);

  const handleBackToIntegrations = () => {
    navigate("/settings");
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="w-full pt-2 md:pt-8 px-4 sm:px-6 md:px-8">
      {/* Header to match Dashboard style */}
      <header className="pt-4 md:pt-0 mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Settings
            </p>
            <h1 className="text-white text-2xl md:text-3xl font-sans font-bold mt-1">
              Email Integrations
            </h1>
          </div>
        </div>
      </header>

      {/* Centered status card */}
      <section className="max-w-2xl mx-auto">
        <DisplayBox className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="text-2xl md:text-3xl">
              <span aria-hidden="true">{toneClasses.icon}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div
                className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium mb-2 ${toneClasses.badge}`}
              >
                {providerLabel}
              </div>

              <h2
                className={`text-lg md:text-xl font-semibold mb-1 ${toneClasses.title}`}
              >
                {title}
              </h2>

              <p className="text-sm md:text-base text-white/80 mb-3">
                {description}
              </p>

              {/* Raw details if you ever want to show them */}
              {errorParam && (
                <p className="text-xs text-white/50">
                  <span className="font-mono">Error code:</span>{" "}
                  <span className="font-mono">{errorParam}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBackToIntegrations}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium
                         bg-white text-slate-900 hover:bg-slate-100 transition"
            >
              Back to Settings
            </button>

            <button
              type="button"
              onClick={handleGoToDashboard}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium
                         border border-white/20 text-white hover:bg-white/10 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </DisplayBox>
      </section>
    </div>
  );
};

export default IntegrationsResponsePage;
