import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../components/AuthProvider";
import Profile from "../components/Profile";
import DisplayBox from "../components/DisplayBox";
import Spinner from "../components/Spinner";

/**
 * ContactPage (UI cleanup + mobile-first)
 * --------------------------------------------------------------------
 * - Responsive layout with a centered, readable max width
 * - Safer data fetching (proper deps, unmount guard, error states)
 * - Handles empty relationships gracefully
 * - Consistent Tailwind tokens & accessible semantics
 * - In-place comments for future maintenance
 */

const ContactPage = () => {
  const { contact_id } = useParams();
  const { session, userData, roleData } = useAuth();

  // ---------------- UI state ----------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------- Data state -------------
  const [contact, setContact] = useState(null);
  const [tenants, setTenants] = useState([]);

  // Whether the user can edit (defend against undefined roleData)
  const canEdit = useMemo(() => Boolean(roleData?.Edit_Contact), [roleData]);

  useEffect(() => {
    if (!session || !userData || !contact_id) return;

    let cancelled = false; // prevent setState after unmount

    const fetchContactAndRelations = async () => {
      setLoading(true);
      setError("");
      try {
        // 1) Fetch Contact
        const { data: contactRow, error: contactErr } = await supabase
          .from("Contact")
          .select("*")
          .eq("contact_id", contact_id)
          .single();
        if (contactErr) throw contactErr;
        if (cancelled) return;
        setContact(contactRow);

        // 2) Fetch related Tenant_Contact rows
        const { data: tenantContacts, error: tenantContactErr } = await supabase
          .from("Tenant_Contact")
          .select("tenant_id")
          .eq("contact_id", contact_id);
        if (tenantContactErr) throw tenantContactErr;

        const tenantIds = (tenantContacts || []).map((t) => t.tenant_id).filter(Boolean);

        // 3) Fetch related tenant rows (if any)
        if (tenantIds.length > 0) {
          const { data: tenantRows, error: tenantErr } = await supabase
            .from("tenant")
            .select("*")
            .in("tenant_id", tenantIds);
          if (tenantErr) throw tenantErr;
          if (!cancelled) setTenants(tenantRows || []);
        } else {
          if (!cancelled) setTenants([]);
        }
      } catch (err) {
        console.error("Error loading contact page:", err);
        if (!cancelled) setError("There was a problem loading this contact.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContactAndRelations();
    return () => {
      cancelled = true;
    };
  }, [session, userData, contact_id]);

  // ---------------- Render ------------------
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0f0f0f] text-white">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 text-white">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      </main>
    );
  }

  if (!contact) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 text-white">
        <p className="text-white/80">Contact not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 text-white sm:py-8">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contact</h1>
        <p className="mt-1 text-sm text-white/60">View profile details and related tenants.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column: Profile card (spans 3 on desktop) */}
        <section className="lg:col-span-3">
          <Profile
            entity={contact}
            session={session}
            getFilePath={(c) => c?.image_file_path}
            getLabel={(c) => c?.Contact_Name}
            getRelatedEntity={async () => tenants}
            getRelatedFilePath={(t) => t?.photo_file_path}
            getRelatedLabel={(t) => t?.Tenant_Name}
            RelatedTitle="Tenant(s)"
            getRelatedEntityId={(t) => t?.tenant_id}
            Title="Contact"
            getEntityId={(c) => c?.contact_id}
            edit_Entity={canEdit}
          />
        </section>

        {/* Right column: Details card (spans 2 on desktop) */}
        <aside className="lg:col-span-2">
          <DisplayBox className="h-full overflow-hidden">
            <section aria-labelledby="contact-info" className="flex h-full flex-col">
              <header className="mb-3 border-b border-white/10 pb-2">
                <h2 id="contact-info" className="text-xl font-semibold tracking-tight">
                  Contact Info
                </h2>
              </header>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/60">Type</dt>
                  <dd className="mt-1 text-sm">{contact?.Contact_Type || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/60">Phone</dt>
                  <dd className="mt-1 text-sm">{contact?.Phone || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/60">Email</dt>
                  <dd className="mt-1 break-words text-sm">{contact?.Email || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/60">Address</dt>
                  <dd className="mt-1 break-words text-sm">{contact?.Address || "—"}</dd>
                </div>
              </dl>
            </section>
          </DisplayBox>
        </aside>
      </div>
    </main>
  );
};

export default ContactPage;