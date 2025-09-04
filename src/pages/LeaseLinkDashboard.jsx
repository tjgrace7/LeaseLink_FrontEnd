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

    // Date range (month-to-date)
    const { startISO, nowISO } = useMemo(() => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startISO: currentMonthStart.toISOString(), nowISO: now.toISOString() };
    }, []);

    // State
    const [companies, setCompanies] = useState([]);
    const [accessRequests, setAccessRequests] = useState([]);
    const [loading, setLoading] = useState({ kpis: false, companies: false, requests: false });
    const [error, setError] = useState({ kpis: '', companies: '', requests: '' });

    const [numberOfCustomers, setCustomers] = useState(0);
    const [customerCosts, setCustomerCost] = useState(0);
    const [tenantUploadCost, setTenantUploadCost] = useState(0);
    const [chatCosts, setChatCosts] = useState(0);
    const [tenantChatCosts, setTenantChatCost] = useState(0);
    const [unitChatCost, setUnitChatCost] = useState(0);
    const [propertyChatCost, setPropertyChatCost] = useState(0);

    const [requestFilter, setRequestFilter] = useState('pending');
    const [activeRequest, setActiveRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalBusy, setModalBusy] = useState(false);

    const isReady = !!session && !!userData?.company_id;

    // Helpers
    const avgBy = (arr, key) => {
        const a = Array.isArray(arr) ? arr : [];
        if (a.length === 0) return 0;
        const sum = a.reduce((acc, x) => acc + (Number(x?.[key]) || 0), 0);
        return sum / a.length;
    };
    const exclLL = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x?.company_id !== LEASELINK_COMPANY);
    const nonzero = (arr, key = 'total_cost') =>
        (Array.isArray(arr) ? arr : []).filter((x) => Number(x?.[key]) > 0);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [showModal]);

    // Fetch Companies + Requests
    useEffect(() => {
        if (!isReady || !isLLAdmin) return;
        (async () => {
            setLoading((s) => ({ ...s, companies: true, requests: true }));
            setError((e) => ({ ...e, companies: '', requests: '' }));

            const [{ data, error: companiesError }, { data: reqData, error: reqError }] = await Promise.all([
                supabase
                    .from('Property_Management_Companies')
                    .select('company_id, company_name, member_status, customer_engagement_elavator')
                    .neq('company_name', 'Leaselink')
                    .order('company_name'),
                supabase
                    .from('access_requests')
                    .select('*')
            ]);

            if (companiesError) {
                console.error('Error Fetching Companies', companiesError);
                setError((e) => ({ ...e, companies: companiesError.message || 'Failed to load companies.' }));
                setCompanies([]);
            } else {
                setCompanies(Array.isArray(data) ? data : []);
            }

            if (reqError) {
                console.error('Error Fetching Requests', reqError);
                setError((e) => ({ ...e, requests: reqError.message || 'Failed to load requests.' }));
                setAccessRequests([]);
            } else {
                setAccessRequests(Array.isArray(reqData) ? reqData : []);
            }

            setLoading((s) => ({ ...s, companies: false, requests: false }));
        })();
    }, [isReady, isLLAdmin]);

    // KPIs
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

    useEffect(() => { fetchKpis(); }, [fetchKpis]);

    // Imposter helper
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

    // Approve → mark request Approved + create company
    const approveRequest = async (request) => {
        setModalBusy(true);
        try {
            const { error: updateError } = await supabase
                .from('access_requests')
                .update({ Approved: 'Approved' })
                .eq('id', request.id);

            if (updateError) throw updateError;

            const { error: createError } = await supabase
                .from('Property_Management_Companies')
                .insert({
                    company_name: request.company_name,
                    member_status: 'New',
                    ClaimedNumUnits: request.number_of_units
                });

            if (createError) throw createError;

            // Update local state (remove from list; it's now a company)
            setAccessRequests((prev) => prev.map(r => r.id === request.id ? { ...r, Approved: 'Approved' } : r));
            setShowModal(false);
        } catch (err) {
            console.error('Approve error:', err);
            alert('Failed to approve request. See console for details.');
        } finally {
            setModalBusy(false);
        }
    };

    const denyRequest = async (request) => {
        setModalBusy(true);
        try {
            const { error } = await supabase
                .from('access_requests')
                .update({ Approved: 'Denied' })
                .eq('id', request.id);
            if (error) throw error;

            setAccessRequests((prev) => prev.map(r => r.id === request.id ? { ...r, Approved: 'Denied' } : r));
            setShowModal(false);
        } catch (err) {
            console.error('Deny error:', err);
            alert('Failed to deny request. See console for details.');
        } finally {
            setModalBusy(false);
        }
    };

    const openRequestModal = (request) => {
        setActiveRequest(request);
        setShowModal(true);
    };

    // Filters
    const pendingRequests = accessRequests.filter((r) => !r.Approved || r.Approved === 'Pending');
    const deniedRequests = accessRequests.filter((r) => r.Approved === 'Denied');
    const visibleRequests = requestFilter === 'pending' ? pendingRequests : deniedRequests;

    if (isReady && !isLLAdmin) {
        return (
            <div className="px-4 py-6 sm:px-6 md:px-8">
                <h1 className="text-2xl font-bold mb-2">LeaseLink Admin Dashboard</h1>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="opacity-80">You don’t have access to this page. If you think this is a mistake, contact an administrator.</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <KpiCard label="Active Clients" value={numberOfCustomers} loading={loading.kpis} />
                        <KpiCard label="Avg Upload / Customer" value={`$${customerCosts.toFixed(2)}`} loading={loading.kpis} />
                        <KpiCard label="Avg Upload / Tenant" value={`$${tenantUploadCost.toFixed(2)}`} loading={loading.kpis} />
                        <KpiCard label="Avg Monthly Chat / Customer" value={`$${chatCosts.toFixed(2)}`} loading={loading.kpis} />
                        <KpiCard label="Avg Monthly Chat / Tenant" value={`$${tenantChatCosts.toFixed(2)}`} loading={loading.kpis} />
                        <KpiCard label="Avg Monthly Chat / Unit" value={`$${unitChatCost.toFixed(2)}`} loading={loading.kpis} />
                        <KpiCard label="Avg Monthly Chat / Property" value={`$${propertyChatCost.toFixed(2)}`} loading={loading.kpis} />
                    </div>
                    {error.kpis && <p className="text-red-300 text-sm mt-3" role="alert">{error.kpis}</p>}
                </section>

                {/* Companies */}
                <section className="mt-8">
                    <div className="rounded-2xl border border-white/10 bg-lease-gradient p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg sm:text-xl font-semibold">Companies</h2>
                            <div className='flex flex-row'>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/create_company')
                                    }}
                                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-[#222222] mr-4"
                                    title="Create Company"
                                >Create Company</button>
                                <div className="w-full sm:w-80">
                                    <SearchBar placeholder="Search companies..." selectEntity={() => { }} type="companies" />
                                </div>
                            </div>
                        </div>

                        {loading.companies ? (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
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
                                        // Wire up to details page if needed
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
                                                            <p className="font-medium break-words">{company.customer_engagement_elavator}</p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setImposter(id); }}
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

                {/* Access Requests */}
                <section className="mt-8">
                    <div className="rounded-2xl border border-white/10 bg-lease-gradient p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg sm:text-xl font-semibold">Access Requests</h2>
                            <div className="w-full sm:w-80">
                                <SearchBar placeholder="Search requests..." selectEntity={() => { }} type="requests" />
                            </div>
                        </div>

                        {/* Filter toggle */}
                        <div className="mt-4">
                            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                                <button
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${requestFilter === 'pending' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}
                                    onClick={() => setRequestFilter('pending')}
                                >
                                    Pending ({pendingRequests.length})
                                </button>
                                <button
                                    className={`ml-1 px-3 py-1.5 rounded-lg text-sm font-medium ${requestFilter === 'denied' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}
                                    onClick={() => setRequestFilter('denied')}
                                >
                                    Denied ({deniedRequests.length})
                                </button>
                            </div>
                        </div>

                        {loading.requests ? (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                                ))}
                            </div>
                        ) : error.requests ? (
                            <p className="text-red-300 text-sm mt-4" role="alert">{error.requests}</p>
                        ) : visibleRequests.length === 0 ? (
                            <p className="opacity-80 text-sm mt-4">No {requestFilter === 'pending' ? 'pending' : 'denied'} requests.</p>
                        ) : (
                            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {visibleRequests.map((request) => {
                                    const openModal = () => openRequestModal(request);

                                    return (
                                        <li key={String(request.id)}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={openModal}
                                                onKeyDown={(e) => onCardKeyDown(e, openModal)}
                                                className="group w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-4 py-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                                            >
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-xs uppercase tracking-wide opacity-70">Company</p>
                                                            <p className="font-semibold truncate">{request.company_name}</p>
                                                        </div>
                                                        <div className="text-right min-w-[7.5rem]">
                                                            <p className="text-xs uppercase tracking-wide opacity-70">Units</p>
                                                            <p className="font-medium">{request.number_of_units}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-xs uppercase tracking-wide opacity-70">Message</p>
                                                            <p className="font-medium break-words line-clamp-2">{request.message || '—'}</p>
                                                        </div>

                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); approveRequest(request); }}
                                                                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-[#222222]"
                                                                title="Approve"
                                                            >
                                                                Approve
                                                            </button>
                                                            {requestFilter === 'pending' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); denyRequest(request); }}
                                                                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400 focus-visible:ring-offset-[#222222]"
                                                                    title="Deny"
                                                                >
                                                                    Deny
                                                                </button>
                                                            )}
                                                        </div>
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

            {/* Modal */}
            {showModal && activeRequest && (
                <RequestModal
                    request={activeRequest}
                    busy={modalBusy}
                    onApprove={() => approveRequest(activeRequest)}
                    onDeny={() => denyRequest(activeRequest)}
                    onClose={() => setShowModal(false)}
                />
            )}
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

// Simple, accessible modal
const RequestModal = ({ request, onApprove, onDeny, onClose, busy }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/70"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                className="absolute inset-0 flex items-center justify-center p-3"
            >
                <div className="w-full max-w-lg rounded-2xl bg-[#1f1f1f] text-white shadow-2xl border border-white/10">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 className="text-lg font-semibold">Request Details</h3>
                        <button
                            className="rounded-md p-1 text-xl leading-none hover:bg-white/10"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="px-4 py-4 space-y-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide opacity-70">Company</p>
                            <p className="font-medium">{request.company_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide opacity-70">Units</p>
                                <p className="font-medium">{request.number_of_units}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide opacity-70">Status</p>
                                <p className="font-medium">{request.Approved ?? 'Pending'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide opacity-70">Message</p>
                            <p className="font-medium whitespace-pre-wrap break-words">
                                {request.message || '—'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
                        {(!request.Approved || request.Approved === 'Pending') && (
                            <>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={onDeny}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-medium"
                                >
                                    {busy ? 'Working…' : 'Deny'}
                                </button>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={onApprove}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium"
                                >
                                    {busy ? 'Working…' : 'Approve'}
                                </button>
                            </>
                        )}
                        {request.Approved === 'Denied' && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaseLinkDashboard;
