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

const LeaseLinkDashboard = () => {
  const navigate = useNavigate();
  const { session, userData } = useAuth();

  // ——— Date window: first day of this month → now (ISO)
  const { startISO, nowISO } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startISO: currentMonthStart.toISOString(),
      nowISO: now.toISOString(),
    };
  }, []);

  // ——— Local state
  const [companyId, setCompanyId] = useState('');

  // KPI values
  const [numberofCustomers, setCustomers] = useState(0);
  const [customerCosts, setCustomerCost] = useState(0);
  const [lifetimeValue, setLifetimeValue] = useState(0);
  const [lifetimeGP, setLifetimeGP] = useState (0)
  const [chatCosts, setChatCosts] = useState(0);

  // Properties list for EntityListBox
  const [tenantUploadCost, setTenantUploadCost] = useState([]);

  // Loading & error UX
  const [loading, setLoading] = useState({ kpis: false, properties: false });
  const [error, setError] = useState({ kpis: '', properties: '' });


  useEffect(() => {
    if(!userData) return
    if(userData.company_id != '74326e0e-58c6-4ba4-9d50-caf5670402f0') navigate('/dashboard')
  }, [userData])
  // ——— Derived guard
  const isReady = !!session && !!userData?.company_id;

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
      const company_id = userData.company_id; // local cache

      // 1) Answered questions (assistant role) this month
      const qCustomers = supabase
        .from('Property_Management_Companies')
        .select('company_id', { count: 'exact', head: true })
        .gte('created_at', startISO)
        .lte('created_at', nowISO)
        .eq('member_status', 'Active')

      // 2) Tenants for this company
      const qLifetimeValue = 0; //TODO Add Lifetimne Value Call when subscriptions set up

      // 3) Lease documents (⚠️ If you store company on this table, filter by it)
      //    TODO: For multi-tenant safety, add `.eq('company_id', company_id)` if available.
    
        const qcosts = supabase.functions.invoke('cost-report', {
            method:'GET',
            headers: ''
        })


      const [cRes, tRes, costRes] = await Promise.all([qCustomers, qLifetimeValue, qcosts]);


      if (cRes.error) throw new Error(`Customers: ${cRes.error.message}`);
      if (tRes.error) throw new Error(`Tenants: ${tRes.error.message}`);
      if (costRes.error) throw new Error(`Docs: ${costRes.error.message}`);

      console.lost(costRes)
      setCustomers(Number(cRes.count ?? 0));
      setLifetimeValue(Number(tRes.count ?? 0));
      setCustomerCost(Number(dRes.count ?? 0));
    } catch (err) {
      setError((e) => ({ ...e, kpis: err.message || 'Failed to load metrics.' }));
    } finally {
      setLoading((s) => ({ ...s, kpis: false }));
    }
  }, [isReady, startISO, nowISO, userData?.company_id]);

  // ——— Fetch Properties list (minimal columns)
  const fetchProperties = useCallback(async () => {
    if (!isReady) return;
    setLoading((s) => ({ ...s, properties: true }));
    setError((e) => ({ ...e, properties: '' }));

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('prop_id, Property_Name, square_footage')
        .eq('pm_company', userData.company_id)
        .order('Property_Name', { ascending: true });

      if (error) throw new Error(error.message);
      setTenantUploadCost(data || []);
    } catch (err) {
      setError((e) => ({ ...e, properties: err.message || 'Failed to load properties.' }));
    } finally {
      setLoading((s) => ({ ...s, properties: false }));
    }
  }, [isReady, userData?.company_id]);

  // ——— Prime company id & kick off loads
  useEffect(() => {
    if (!session || !userData) return;
    if (userData.company_id) setCompanyId(userData.company_id);
  }, [session, userData]);

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
    <div className="
      w-full 
      md:mt-6
      md:static
      md:min-h-0
      px-0 md:px-0
    ">
      <div
        className="
          fixed inset-x-0 top-14 bottom-0 overflow-y-auto
          md:static md:inset-auto md:overflow-visible
        "
      >
        {/* Page header */}
        <header className="px-4 sm:px-6 md:px-8 pt-4 md:pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-sans font-bold">Dashboard</h1>
          </div>
        </header>

        {/* KPI grid */}
        <section className="px-4 sm:px-6 md:px-8 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard label="Number of Active Clients" value={numberofCustomers} loading={loading.kpis} />
            <KpiCard label="Average Customer Onboarding Costs" value={customerCosts} loading={loading.kpis} />
            <KpiCard label="Average Document Upload Cost Per Tenant" value={tenantUploadCost} loading={loading.kpis} />
            <KpiCard label="Average Monthly Chat Cost" value={chatCosts} loading={loading.kpis} />
            <KpiCard label="Lifetime Value" value={lifetimeValue} loading={loading.kpis} />
            <KpiCard label="Lifetime Gross Profit" value={lifetimeGP} loading={loading.kpis} />
            
            
          </div>
          {error.kpis && (
            <p className="text-red-300 text-sm mt-3" role="alert">{error.kpis}</p>
          )}
        </section>

        {/* Properties list */}
        <section className="px-4 sm:px-6 md:px-8 mt-6 sm:mt-8">
          {loading.properties ? (
            <div className="animate-pulse">
              <div className="h-24 rounded-2xl bg-white/10" />
            </div>
          ) : tenantUploadCost.length === 0 ? (
            <Empty title="No Companies Yet" hint="Create a property to see it here." />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <EntityListBox
                type="units_properties_tenants"
                entities={tenantUploadCost}
                selectEntity={navigateEntity}
                getEntityLabel={(p) => p.Property_Name || 'Unnamed Property'}
                getEntityId={(p) => p.prop_id}
                getSQ={(p) => p.square_footage}
                Label="Properties"
                placeholder="Properties"
                boxType="property"
              />
            </div>
          )}
          {error.properties && (
            <p className="text-red-300 text-sm mt-3" role="alert">{error.properties}</p>
          )}
        </section>
      </div>
    </div>
  );
};


export default LeaseLinkDashboard;