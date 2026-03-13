import { useAuth } from '../components/AuthProvider';
import DisplayBox from '../components/DisplayBox';
import EntityListBox from '../components/EntityListBox';
import LoadPreviousMessages from '../components/PreviousMessages';
import { supabase } from '../supabaseClient';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard
 * ------------------------------------------------------------
 * Goals of this refactor:
 * 1) Mobile-first, responsive layout with accessible semantics.
 * 2) Server-side counts (lighter queries) and proper loading/empty states.
 * 3) Clear comments + small utilities to keep JSX tidy.
 * 4) Fewer re-renders (stable callbacks/memos) and safe effects with guards.
 * 5) Consistent styling via Tailwind.
 */
function CardShell({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 h-full min-h-0 flex flex-col ${className}`}>
      {title ? <div className="mb-3 font-semibold shrink-0">{title}</div> : null}

      {/* Let children control scrolling; this just provides the height context */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
const Dashboard = () => {
  const navigate = useNavigate();
  const { session, userData, effectiveCompanyId: contextCompanyId } = useAuth();

  // Keep activeCompanyId in sync when imposter mode changes
  useEffect(() => {
    const id = contextCompanyId || localStorage.getItem('activeCompanyId') || '';
    setActiveCompanyId(id);
  }, [contextCompanyId]);

  // ——— Date window: first day of this month → now (ISO)
  const { startISO, nowISO } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startISO: currentMonthStart.toISOString(),
      nowISO: now.toISOString(),
    };
  }, []);

  // KPI values
  const [messageCount, setMessageCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [activeCompanyId, setActiveCompanyId] = useState(() => localStorage.getItem('activeCompanyId') || '')

  // Properties list for EntityListBox
  const [properties, setProperties] = useState([]);

  // Loading & error UX
  const [loading, setLoading] = useState({ kpis: false, properties: false });
  const [error, setError] = useState({ kpis: '', properties: '' });

  // ——— Derived guard
  const isReady = !!session && !!activeCompanyId

  // ——— Centralized navigation handler (stable reference)
  const navigateEntity = useCallback((id, type) => {
    // Future: PermissionGate can go here.
    navigate(`/${type}/${id}`);
  }, [navigate]);

  // ——— Fetch KPIs (messages, tenants, docs)
  const fetchKpis = useCallback(async () => {
    if (!isReady) return;
    setLoading((s) => ({ ...s, kpis: true }));
    setError((e) => ({ ...e, kpis: '' }));

    try {


      // 1) Answered questions (assistant role) this month
      const qMessages = supabase
        .from('entity_questions')
        .select('role', { count: 'exact', head: true })
        .gte('created_at', startISO)
        .lte('created_at', nowISO)
        .eq('role', 'assistant')
        .eq('company_id', activeCompanyId);

      // 2) Tenants for this company
      const qTenants = supabase
        .from('tenant')
        .select('tenant_id', { count: 'exact', head: true })
        .eq('property_management_id', activeCompanyId);

      // 3) Lease documents (⚠️ If you store company on this table, filter by it)
      //    TODO: For multi-tenant safety, add `.eq('company_id', company_id)` if available.
      const qDocs = supabase
        .from('lease_documents')
        .select('lease_id', { count: 'exact', head: true })
        .eq('company_id', activeCompanyId);

      const [mRes, tRes, dRes] = await Promise.all([qMessages, qTenants, qDocs]);


      if (mRes.error) throw new Error(`Messages: ${mRes.error.message}`);
      if (tRes.error) throw new Error(`Tenants: ${tRes.error.message}`);
      if (dRes.error) throw new Error(`Docs: ${dRes.error.message}`);

      setMessageCount(Number(mRes.count ?? 0));
      setTenantCount(Number(tRes.count ?? 0));
      setDocsCount(Number(dRes.count ?? 0));
    } catch (err) {
      setError((e) => ({ ...e, kpis: err.message || 'Failed to load metrics.' }));
    } finally {
      setLoading((s) => ({ ...s, kpis: false }));
    }
  }, [isReady, startISO, nowISO, activeCompanyId]);

  // ——— Fetch Properties list (minimal columns)
  const fetchProperties = useCallback(async () => {
    if (!isReady) return;
    setLoading((s) => ({ ...s, properties: true }));
    setError((e) => ({ ...e, properties: '' }));

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('pm_company', activeCompanyId)
        .order('Property_Name', { ascending: true });

      if (error) throw new Error(error.message);
      setProperties(data || []);
    } catch (err) {
      setError((e) => ({ ...e, properties: err.message || 'Failed to load properties.' }));
    } finally {
      setLoading((s) => ({ ...s, properties: false }));
    }
  }, [isReady, activeCompanyId]);

  useEffect(() => {
    if(!userData) return;
    if(!userData.First_Value )
      {
        const getRole = async () => {
          const {data, error} = await supabase.from('Roles').select("*").eq('id', userData.role_id).single()
          if(error) {
            console.error("Error Fetching Role")
          }
          if(data.Create_Properties)
          {
            navigate('/special-access')
          }
          else {
            navigate('/chat')
          }
        }
        getRole()

      }
  }, [userData, navigate])
  useEffect(() => {
    if (!isReady) return;
    fetchKpis();
    fetchProperties();
  }, [isReady, fetchKpis, fetchProperties]);


  // ——— Reusable tiny KPI card (keeps JSX clean)
  const KpiCard = ({ label, value, sublabel, loading: isLoading }) => (
    <DisplayBox className="w-full sm:w-auto flex-1 min-w-[140px] p-4 md:p-5
                         min-h-[120px] grid place-items-center">
      <div className="text-center">
        <h2 className="text-sm md:text-base font-semibold tracking-wide opacity-80">{label}</h2>
        {sublabel ? <p className="text-xs opacity-60 mt-0.5">{sublabel}</p> : null}
        <p className="text-3xl md:text-4xl font-bold mt-3 tabular-nums">
          {isLoading ? '—' : value}
        </p>
      </div>
    </DisplayBox>
  );

  // ——— Empty state for lists
  const Empty = ({ title = 'No data', hint }) => (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <p className="text-base font-medium">{title}</p>
      {hint && <p className="text-sm opacity-70 mt-1">{hint}</p>}
    </div>
  );

  return (
    // Mobile: full viewport minus nav | Desktop: normal flow
 <div className="w-full pt-2 md:pt-8 px-0 md:px-0">
      <div className="md:static md:inset-auto md:overflow-visible">
        {/* Page header */}
        <header className="px-4 sm:px-6 md:px-8 pt-4 md:pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-2xl md:text-4xl font-sans font-bold">Dashboard</h1>
          </div>
        </header>

        {/* KPI grid */}
        <section className="px-4 sm:px-6 md:px-8 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard label="Monthly Answered Questions" value={messageCount} loading={loading.kpis} />
            <KpiCard label="Tenant Docs Extracted" value={docsCount} loading={loading.kpis} />
            <KpiCard label="Current Tenants" value={tenantCount} loading={loading.kpis} />
            <KpiCard label="Number of Properties" value={properties.length} loading={loading.properties} />
          </div>
          {error.kpis && (
            <p className="text-red-300 text-sm mt-3" role="alert">{error.kpis}</p>
          )}
        </section>

        {/* Properties + Previous Messages */}
        <section className="px-4 sm:px-6 md:px-8 mt-6 sm:mt-8 mb-2 md:mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 auto-rows-fr h-[70dvh] min-h-0">
            {/* Left: Properties */}
            <div className='min-h-0'>
              {loading.properties ? (
                <div className="animate-pulse">
                  <div className="h-24 rounded-2xl bg-white/10" />
                </div>
              ) : properties.length === 0 ? (
                <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <p className="text-base font-medium">No properties yet</p>
                  <p className="text-sm opacity-70 mt-1">Create a property to see it here.</p>
                </div>
              ) : (
                <CardShell>
                  <EntityListBox
                    className='h-full'
                    type="units_properties_tenants"
                    entities={properties}
                    selectEntity={navigateEntity}
                    getEntityLabel={(p) => p.Property_Name || 'Unnamed Property'}
                    getEntityId={(p) => p.prop_id}
                    getSQ={(p) => p.square_footage}
                    Label="Properties"
                    placeholder="Properties"
                    boxType="property"
                  />
                </CardShell>
              )}
              {error.properties && (
                <p className="text-red-300 text-sm mt-3" role="alert">{error.properties}</p>
              )}
            </div>

            {/* Right: Previous Messages (fluid + scroll) */}
            <div className="min-h-0">
              {activeCompanyId && (
                <CardShell>
                  <LoadPreviousMessages
                    className="h-full"
                    entityId={activeCompanyId}
                    session={session}
                    listHeight='h-full'
                    entityType="company"
                    autoSize={true}             // default; can omit
                    maxRowsBeforeScroll={8}   // tweak if you want earlier/later scroll
                  // listHeight not passed → auto-size kicks in
                  />
                </CardShell>
              )}

            </div>
          </div>
        </section>
      </div>
    </div>

  );
};


export default Dashboard;
