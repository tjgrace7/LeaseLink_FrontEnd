import { useAuth } from '../components/AuthProvider';
import DisplayBox from '../components/DisplayBox';
import SearchBar from '../components/SearchBar';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, useCallback } from 'react';

const LEASELINK_COMPANY = '74326e0e-58c6-4ba4-9d50-caf5670402f0';

const LeaseLinkDashboard = () => {
  const { session, userData, roleData, setFrontEndCompany } = useAuth();
  const navigate = useNavigate();

  const isLLAdmin =
    !!roleData?.Is_LeaseLink_Admin || userData?.company_id === LEASELINK_COMPANY;

  const { startISO, nowISO } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startISO: currentMonthStart.toISOString(), nowISO: now.toISOString() };
  }, []);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState({ kpis: false, companies: false });
  const [error, setError] = useState({ kpis: '', companies: '' });

  const [numberOfCustomers, setCustomers] = useState(0);
  const [customerCosts, setCustomerCost] = useState(0);
  const [tenantUploadCost, setTenantUploadCost] = useState(0);
  const [chatCosts, setChatCosts] = useState(0);
  const [tenantChatCosts, setTenantChatCost] = useState(0);
  const [unitChatCost, setUnitChatCost] = useState(0);
  const [propertyChatCost, setPropertyChatCost] = useState(0);

  const isReady = !!session && !!userData?.company_id;

  const avgBy = (arr, key) => {
    const a = Array.isArray(arr) ? arr : [];
    if (a.length === 0) return 0;
    const sum = a.reduce((acc, x) => acc + (Number(x?.[key]) || 0), 0);
    return sum / a.length;
  };
  const exclLL = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x?.company_id !== LEASELINK_COMPANY);
  const nonzero = (arr, key = 'total_cost') =>
    (Array.isArray(arr) ? arr : []).filter((x) => Number(x?.[key]) > 0);

  useEffect(() => {
    if (!isReady || !isLLAdmin) return;
    (async () => {
      setLoading((s) => ({ ...s, companies: true }));
      setError((e) => ({ ...e, companies: '' }));
      const { data, error } = await supabase
        .from('Property_Management_Companies')
        .select('company_id, company_name, member_status, customer_engagement_elavator')
        .neq('company_name', 'Leaselink')
        .order('company_name');
      if (error) {
        console.error('Error Fetching Companies', error);
        setError((e) => ({ ...e, companies: error.message || 'Failed to load companies.' }));
        setCompanies([]);
      } else {
        setCompanies(Array.isArray(data) ? data : []);
      }
      setLoading((s) => ({ ...s, companies: false }));
    })();
  }, [isReady, isLLAdmin]);

  const fetchKpis = useCallback(async () => {
    if (!isReady || !isLLAdmin) return;
    setLoading((s) => ({ ...s, kpis: true }));
    setError((e) => ({ ...e, kpis: '' }));

    try {
      const qCustomers = supabase
        .from('Property_Management_Companies')
        .select('company_id', { count: 'exact', head: true })
        .gte('created_at', startISO)
        .lte('created_at', nowISO)
        .eq('member_status', 'Active');

      const qCosts = supabase.functions.invoke('cost-report', { method: 'GET' });

      const [cRes, costRes] = await Promise.all([qCustomers, qCosts]);

      if (cRes.error) throw new Error(`Customers: ${cRes.error.message}`);
      if (costRes.error) throw new Error(`Costs: ${costRes.error.message}`);

      const uploadsByCompany = exclLL(costRes.data?.uploads?.by_company);
      const uploadsByTenant = exclLL(costRes.data?.uploads?.by_tenant);
      const chatsByCompany = exclLL(costRes.data?.chats?.by_company);
      const chatsByEntity = exclLL(costRes.data?.chats?.by_entity);

      const avgCompanyUpload = avgBy(nonzero(uploadsByCompany), 'total_cost');
      const avgTenantUpload = avgBy(nonzero(uploadsByTenant), 'total_cost');
      const avgCompanyChat = avgBy(chatsByCompany, 'total_cost');

      const tenantChats = chatsByEntity.filter((c) => c?.entity_type === 'Tenant');
      const unitChats = chatsByEntity.filter((c) => c?.entity_type === 'Unit');
      const propertyChats = chatsByEntity.filter((c) => c?.entity_type === 'Property');

      const avgTenantChat = avgBy(tenantChats, 'total_cost');
      const avgUnitChat = avgBy(unitChats, 'total_cost');
      const avgPropertyChat = avgBy(propertyChats, 'total_cost');

      setCustomers(Number(cRes.count ?? 0));
      setCustomerCost(avgCompanyUpload);
      setTenantUploadCost(avgTenantUpload);
      setChatCosts(avgCompanyChat);
      setTenantChatCost(avgTenantChat);
      setUnitChatCost(avgUnitChat);
      setPropertyChatCost(avgPropertyChat);
    } catch (err) {
      setError((e) => ({ ...e, kpis: err?.message || 'Failed to load metrics.' }));
    } finally {
      setLoading((s) => ({ ...s, kpis: false }));
    }
  }, [isReady, isLLAdmin, startISO, nowISO]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const setImposter = async (company_id) => {
    const { error } = await supabase
      .from('User_Data')
      .update({ Imposter: true })
      .eq('auth_id', session?.user?.id);
    if (error) {
      console.error('Failed to set Imposter:', error);
      return;
    }
    await setFrontEndCompany(company_id);
    navigate('/dashboard');
  };

  const onCardKeyDown = (e, activate) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };

  if (isReady && !isLLAdmin) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <h1 className="text-2xl font-bold mb-2">LeaseLink Admin Dashboard</h1>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="opacity-80">
            You don’t have access to this page. If you think this is a mistake, contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sticky header */}
      <div className="sticky z-10 bg-[#222222]/80 backdrop-blur supports-[backdrop-filter]:bg-[#222222]/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3">
          <h1 className="text-2xl sm:text-3xl font-bold">LeaseLink Admin Dashboard</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-10">
        {/* KPI grid */}
        <section className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard label="Active Clients" value={numberOfCustomers} loading={loading.kpis} />
            <KpiCard label="Avg Upload / Customer" value={`$${customerCosts.toFixed(2)}`} loading={loading.kpis} />
            <KpiCard label="Avg Upload / Tenant" value={`$${tenantUploadCost.toFixed(2)}`} loading={loading.kpis} />
            <KpiCard label="Avg Monthly Chat / Customer" value={`$${chatCosts.toFixed(2)}`} loading={loading.kpis} />
            <KpiCard label="Avg Monthly Chat / Tenant" value={`$${tenantChatCosts.toFixed(2)}`} loading={loading.kpis} />
            <KpiCard label="Avg Monthly Chat / Unit" value={`$${unitChatCost.toFixed(2)}`} loading={loading.kpis} />
            <KpiCard label="Avg Monthly Chat / Property" value={`$${propertyChatCost.toFixed(2)}`} loading={loading.kpis} />
          </div>
          {error.kpis && (
            <p className="text-red-300 text-sm mt-3" role="alert">
              {error.kpis}
            </p>
          )}
        </section>

        {/* Companies */}
        <section className="mt-8">
          <div className="rounded-2xl border border-white/10 bg-lease-gradient p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-semibold">Companies</h2>
              <div className="w-full sm:w-80">
                <SearchBar placeholder="Search companies..." selectEntity={() => {}} type="companies" />
              </div>
            </div>

            {loading.companies ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : error.companies ? (
              <p className="text-red-300 text-sm mt-4" role="alert">{error.companies}</p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(companies || []).map((company) => {
                  const id = company.company_id;
                  const name = company.company_name;

                  const goToCompany = () => {
                    // Hook up if you have a company details page
                    console.log('Go to Company Page', id);
                  };

                  return (
                    <li key={String(id)}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={goToCompany}
                        onKeyDown={(e) => onCardKeyDown(e, goToCompany)}
                        className="group w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-4 py-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-wide opacity-70">Company</p>
                              <p className="font-semibold truncate">{name}</p>
                            </div>
                            <div className="text-right min-w-[7.5rem]">
                              <p className="text-xs uppercase tracking-wide opacity-70">Status</p>
                              <p className="font-medium">{company.member_status}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-wide opacity-70">Engagement</p>
                              <p className="font-medium truncate">{company.customer_engagement_elavator}</p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImposter(id);
                              }}
                              className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-[#222222]"
                              title="Edit Company"
                            >
                              Edit Company
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, sublabel, loading: isLoading }) => (
  <DisplayBox className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 min-h-[112px]">
    <div className="flex flex-col items-center text-center">
      <h3 className="text-sm md:text-base font-semibold tracking-wide opacity-80">{label}</h3>
      {sublabel ? <p className="text-xs opacity-60 mt-0.5">{sublabel}</p> : null}
      <p className="text-3xl md:text-4xl font-bold mt-3 tabular-nums">
        {isLoading ? <span className="inline-block w-20 h-7 rounded bg-white/10 animate-pulse" /> : value}
      </p>
    </div>
  </DisplayBox>
);

export default LeaseLinkDashboard;
