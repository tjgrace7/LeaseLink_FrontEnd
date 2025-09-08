// src/pages/Settings.jsx (refactor, full file)

// Mobile-first, accessible, commented, and UI-polished

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthProvider';
import DisplayBox from '../components/DisplayBox';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiPlus, FiTrash, FiRotateCcw, FiDownload } from 'react-icons/fi';
import { getTable } from '../utilities/supabaseCalls';
import { ArchiveEntity, UnarchiveEntity } from '../utilities/Generic';
import { Import } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';

/**
 * Settings
 * ------------------------------------------------------------
 * Tabs: Company • Users • Roles • Subscription • Import
 * - Mobile-first tabs with role-gated visibility
 * - Company/Users/Roles loaders preserved
 * - Import:
 *    - Accepts any CSV headers
 *    - Detects headers and builds best-guess mapping
 *    - Manual mapping UI (required vs optional vs one-of)
 *    - Submit enabled only when required/one-of rules satisfied
 *    - Admin can choose target company to import into
 */

const Settings = () => {
  const navigate = useNavigate();
  const { roleData, session } = useAuth();

  // —— Active company
  const currentCompanyId = localStorage.getItem('activeCompanyId');

  // —— Guards
  const isReady = Boolean(session && currentCompanyId);

  // ——— Tab state — default to the first permitted tab
  const firstAllowedTab = useMemo(() => {
    if (!roleData) return '';
    if (roleData.Edit_Company) return 'Company';
    if (roleData.View_Other_Users) return 'Users';
    if (roleData.Edit_Roles) return 'Roles';
    if (roleData.Edit_Subscription) return 'Subscription';
    if (roleData.Create_Tenants || roleData.Create_Unit) return 'Import';
    return '';
  }, [roleData]);

  const [tab, setTab] = useState('');
  useEffect(() => {
    if (firstAllowedTab) setTab(firstAllowedTab);
  }, [firstAllowedTab]);

  // ——— Company
  const [companyName, setCompanyName] = useState('');
  const [numTenants, setNumTenants] = useState('');

  // ——— Users & Roles
  const [users, setUsers] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [roles, setRoles] = useState([]);

  // ——— Loading/Error
  const [loading, setLoading] = useState({ company: false, users: false, roles: false });
  const [error, setError] = useState({ company: '', users: '', roles: '' });

  // ——— Users: show/hide archived toggle
  const [showArchived, setShowArchived] = useState(false);

  // ——— Import selection
  const [importSelected, setImportSelected] = useState(false);
  const [selectedImport, setSelectedImport] = useState(''); // 'Tenants' | 'Units'

  // ——— Admin: choose target company for import
  const [targetCompanyId, setTargetCompanyId] = useState(currentCompanyId || '');
  const [allCompanies, setAllCompanies] = useState([]);

  // ——— Import: CSV + mapping + validation
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [parsingError, setParsingError] = useState('');

  // mapping: expectedHeader -> detectedHeader (or '')
  const [mapping, setMapping] = useState({});
  const [mappingValid, setMappingValid] = useState(false);

  // UI: import button state
  const [importing, setImporting] = useState(false);

  // ——— Expected fields by type (required vs optional + one-of groups)
  // NOTE: "oneOf" means at least ONE of the labels in the inner array must be mapped.
  const EXPECTED = {
    Tenants: {
      required: [
        'Tenant Name',
        'DBA',
        'Active',
        'Property 1 (Property Name)',
      ],
      oneOf: [
        ['Unit 1 (Address)', 'Unit 1 (Suite)'],
      ],
      optional: [
        'Unit 1 (Address)',
        'Unit 1 (Suite)',
        'Unit 2 (Address)',
        'Unit 2 (Suite)',
        'Unit 3 (Address)',
        'Unit 3 (Suite)',
      ],
    },
    Units: {
      required: ['Suite Id', 'Address', 'Square Footage', 'Property Name'],
      oneOf: [],
      optional: [],
    },
  };

  // ——— Helpers
  const norm = (s) => (s ?? '').toString().trim().replace(/\s+/g, ' ').toLowerCase();

  // Best-effort initial guess: exact match; else "contains" either direction.
  const guessMap = (detected, expectedList) => {
    const detNorm = detected.map((d) => ({ raw: d, n: norm(d) }));
    const used = new Set();
    const result = {};
    expectedList.forEach((exp) => {
      const en = norm(exp);
      let hit = detNorm.find((d) => d.n === en && !used.has(d.raw));
      if (!hit) hit = detNorm.find((d) => (d.n.includes(en) || en.includes(d.n)) && !used.has(d.raw));
      if (hit) {
        result[exp] = hit.raw;
        used.add(hit.raw);
      } else {
        result[exp] = '';
      }
    });
    return result;
  };

  // overall validity:
  // - all required must be mapped to existing detected header
  // - each oneOf group must have at least one mapped to an existing detected header
  const computeMappingValid = (mapObj, detected, requiredList, oneOfGroups) => {
    const set = new Set(detected);

    const requiredOK = requiredList.every((exp) => {
      const picked = mapObj[exp];
      return typeof picked === 'string' && picked.length > 0 && set.has(picked);
    });

    const oneOfOK = (oneOfGroups || []).every((group) => {
      return group.some((exp) => {
        const picked = mapObj[exp];
        return typeof picked === 'string' && picked.length > 0 && set.has(picked);
      });
    });

    return requiredOK && oneOfOK;
  };

  const resetImportState = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setParsingError('');
    setMapping({});
    setMappingValid(false);
  };

  const downloadTemplate = (blobOrUrl, filename) => {
    const link = document.createElement('a');
    link.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ——— Load company
  useEffect(() => {
    if (!isReady || !roleData?.Edit_Company) return;
    const loadCompany = async () => {
      setLoading((s) => ({ ...s, company: true }));
      setError((e) => ({ ...e, company: '' }));
      try {
        const res = await getTable('Property_Management_Companies', 'company_id', currentCompanyId);
        if (!res || !res[0]) throw new Error('Company not found');
        setCompanyName(res[0].company_name || '');
        setNumTenants(res[0].numTenants ?? '');
      } catch (err) {
        console.error('Company load error', err);
        setError((e) => ({ ...e, company: err?.message || 'Failed to load company.' }));
      } finally {
        setLoading((s) => ({ ...s, company: false }));
      }
    };
    loadCompany();
  }, [isReady, roleData?.Edit_Company, currentCompanyId]);

  // ——— Load users
  useEffect(() => {
    if (!isReady || !roleData?.View_Other_Users) return;
    const loadUsers = async () => {
      setLoading((s) => ({ ...s, users: true }));
      setError((e) => ({ ...e, users: '' }));
      try {
        const res = await getTable('User_Data', 'company_id', currentCompanyId);
        setUsers(res || []);
      } catch (err) {
        console.error('Users load error', err);
        setError((e) => ({ ...e, users: err?.message || 'Failed to load users.' }));
      } finally {
        setLoading((s) => ({ ...s, users: false }));
      }
    };
    loadUsers();
  }, [isReady, roleData?.View_Other_Users, currentCompanyId]);

  // ——— Resolve user role names
  useEffect(() => {
    if (!users.length) { setUserRoles([]); return; }
    let cancelled = false;
    const resolveRoles = async () => {
      try {
        const results = await Promise.all(
          users.map(async (u) => {
            if (!u.role_id) return { ...u, role: 'Unassigned' };
            const r = await getTable('Roles', 'id', u.role_id);
            return { ...u, role: r?.[0]?.Role_Name ?? 'Unknown' };
          })
        );
        if (!cancelled) setUserRoles(results);
      } catch (err) {
        console.error('User role resolve error', err);
      }
    };
    resolveRoles();
    return () => { cancelled = true; };
  }, [users]);

  // ——— Load roles list
  useEffect(() => {
    if (!isReady || !roleData?.Edit_Roles) return;
    const loadRoles = async () => {
      setLoading((s) => ({ ...s, roles: true }));
      setError((e) => ({ ...e, roles: '' }));
      try {
        const res = await getTable('Roles', 'company_id', currentCompanyId);
        setRoles(res || []);
      } catch (err) {
        console.error('Roles load error', err);
        setError((e) => ({ ...e, roles: err?.message || 'Failed to load roles.' }));
      } finally {
        setLoading((s) => ({ ...s, roles: false }));
      }
    };
    loadRoles();
  }, [isReady, roleData?.Edit_Roles, currentCompanyId]);

  // ——— Admin: load all companies for selector
  useEffect(() => {
    if (!isReady || !roleData?.Is_LeaseLink_Admin) return;

    const loadCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('Property_Management_Companies')
          .select('company_id, company_name')
          .order('company_name', { ascending: true });

        if (error) throw error;
        setAllCompanies(data || []);
        if (!targetCompanyId && data?.length) setTargetCompanyId(data[0].company_id);
      } catch (e) {
        console.error('Admin companies load error', e);
      }
    };

    loadCompanies();
  }, [isReady, roleData?.Is_LeaseLink_Admin, targetCompanyId]);

  // —— Helpers
  const isArchived = (row) => {
    const v = row?.archived;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === 't' || s === '1' || s === 'yes';
    }
    return Boolean(v);
  };

  const archivedCount = useMemo(
    () => (Array.isArray(userRoles) ? userRoles.filter(isArchived).length : 0),
    [userRoles]
  );

  const displayedUsers = useMemo(() => {
    if (!Array.isArray(userRoles)) return [];
    return showArchived ? userRoles : userRoles.filter((u) => !isArchived(u));
  }, [userRoles, showArchived]);

  // ——— Archive/Restore handlers (optimistic)
  const toggleArchiveUser = async (user) => {
    try {
      if (isArchived(user)) {
        await UnarchiveEntity('User', user.user_id);
      } else {
        await ArchiveEntity('User', user.user_id);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, archived: !isArchived(user) } : u
        )
      );
    } catch (e) {
      console.error('Toggle archive failed', e);
    }
  };

  // ——— Safe Tab button
  const TabButton = ({ isActive, onClick, children, className = '' }) => {
    const base = 'px-3 py-2 rounded-xl border text-sm sm:text-base transition';
    const active = 'bg-white/20 border-white/20';
    const idle = 'bg-white/5 border-white/10 hover:bg-white/10';
    const composed = [base, isActive ? active : idle, className].filter(Boolean).join(' ');
    return (
      <button className={composed} onClick={onClick}>
        {children}
      </button>
    );
  };

  // ——— CSV parse (headers only) -> build mapping
  const handleCSVChange = (e) => {
    setParsingError('');
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
    setCsvHeaders([]);
    setMapping({});
    setMappingValid(false);

    if (!file) return;

    Papa.parse(file, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res?.meta?.fields || [];
        setCsvHeaders(headers);

        const kind = selectedImport; // 'Tenants' or 'Units'
        const required = EXPECTED[kind]?.required ?? [];
        const optional = EXPECTED[kind]?.optional ?? [];
        const oneOf = EXPECTED[kind]?.oneOf ?? [];

        // Start with guesses for all labels that may appear in UI:
        const allLabels = [...required, ...optional, ...oneOf.flat()];
        const initial = {
          ...guessMap(headers, allLabels),
        };

        setMapping(initial);
        setMappingValid(
          computeMappingValid(initial, headers, required, oneOf)
        );
      },
      error: (err) => {
        console.error('CSV parse error', err);
        setParsingError(err?.message || 'Failed to parse CSV.');
      },
    });
  };

  // ---------- NEW HELPERS FOR IMPORT ----------
  const toBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    if (['true', 't', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', 'f', '0', 'no', 'n'].includes(s)) return false;
    return null;
  };

  const parseCSVFile = (file) =>
    new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => String(h).trim(),
        transform: (val) => (typeof val === 'string' ? val.trim() : val),
        complete: (res) => resolve(res.data || []),
        error: (err) => reject(err),
      });
    });

  function buildEntityFromRow(row, mapping, kind) {
    // mapping: UI label -> detected CSV header
    const get = (label) => {
      const header = mapping?.[label];
      if (!header) return undefined;
      return row?.[header];
    };

    if (kind === 'Units') {
      const square = get('Square Footage');
      return {
        property_name: get('Property Name') ?? '',
        suite: get('Suite Id') ?? '',
        address: get('Address') ?? '',
        square_footage:
          square === '' || square == null || Number.isNaN(Number(square)) ? null : Number(square),
      };
    }

    // Tenants
    let active = get('Active');
    // one-of: choose address first; if not present, use suite
    const unit1Address = get('Unit 1 (Address)') || '';
    const unit1Suite = get("Unit 1 (Suite)") || ''
    // optional: same approach for other units
    const unit2Address = get('Unit 2 (Address)') || '';
    const unit2Suite = get("Unit 2 (Suite)") || ''
    const unit3Address = get('Unit 3 (Address)') || '';
    const unit3Suite = get("Unit 3 (Suite") || ''
    if (active === "Active" || active === 'T') active = true;
    else if (active === "F") active = false
    console.log(active)
    return {
      tenant_name: get('Tenant Name') ?? '',
      dba: get('DBA') ?? null,
      active: toBool(active),
      property: get('Property 1 (Property Name)') ?? '',
      unit1address: unit1Address,
      unit1Suite: unit1Suite,
      unit2Address: unit2Address,
      unit2Suite: unit2Suite,
      unit3Address: unit3Address,
      unit3Suite: unit3Suite
    };
  }

  function isEntityEmpty(entity) {
    return Object.values(entity).every(
      (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
    );
  }
  function downloadCsv(filename, csv) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // in case the button is inside a form, prevent focus-steal:
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  // ——— Submit: parse entire CSV, normalize rows, call Edge Function
  const handleSubmitImport = async () => {
    const kind = selectedImport; // 'Tenants' | 'Units'
    const target = roleData?.Is_LeaseLink_Admin ? targetCompanyId : currentCompanyId;

    if (!mappingValid || !csvFile || !target) {
      alert('Please finish mapping required fields and select a company.');
      return;
    }

    try {
      setImporting(true);

      // 1) Parse full CSV
      const rawRows = await parseCSVFile(csvFile);
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        alert('No rows found in the CSV.');
        return;
      }

      // 2) Build normalized entities from mapping
      // ...
      const entities = rawRows
        .map((row) => buildEntityFromRow(row, mapping, kind))
        .filter((e) => !isEntityEmpty(e));

      if (entities.length === 0) {
        alert("All rows appear to be empty after mapping.");
        return;
      }

      // 3) Call the Edge Function "Import"
      const { data, error } = await supabase.functions.invoke("Import", {
        body: { kind, entities, company_id: target },
      });

      if (error) {
        console.error("Import function error:", error);
        alert(`Import failed: ${error.message ?? "Unknown error"}`);
        return;
      }

      // If the response body wasn't marked as JSON server-side,
      // supabase can hand it to you as a string. Guard-parse.
      const parsed =
        typeof data === "string"
          ? (() => {
            try {
              return JSON.parse(data);
            } catch {
              return {};
            }
          })()
          : data ?? {};

      const {
        success = false,
        summary = {},
        failures = [],
        successes = [],
        error_csv = "",
      } = parsed;

      const total = summary.total ?? failures.length + successes.length;
      const succeeded = summary.succeeded ?? successes.length;
      const failed = summary.failed ?? failures.length;

      // Offer a CSV download if there were failures
      if (error_csv && failed > 0) {
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        downloadCsv(`${kind || "import"}-errors-${ts}.csv`, error_csv);
      }

      let msg = `Import complete for ${kind} into company ${target}.
Total rows: ${total}
Succeeded: ${succeeded}
Failed: ${failed}`;

      if (failed > 0) {
        const sample = failures
          .slice(0, 5)
          .map((f) => `- Row ${Number(f.index) + 2}: ${f.message}`)
          .join('\n');
        msg += `

Some failures:
${sample}
${failures.length > 5 ? `...and ${failures.length - 5} more.` : ''}`;
      }

      alert(msg);
    } catch (err) {
      console.error(err);
      alert(`Unexpected error during import: ${err?.message ?? String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6">
      {/* Tabs header */}
      <div className="flex flex-wrap gap-2 mb-4">
        {roleData?.Edit_Company && (
          <TabButton isActive={tab === 'Company'} onClick={() => setTab('Company')}>
            Company Settings
          </TabButton>
        )}
        {roleData?.View_Other_Users && (
          <TabButton isActive={tab === 'Users'} onClick={() => setTab('Users')}>
            Users
          </TabButton>
        )}
        {roleData?.Edit_Roles && (
          <TabButton isActive={tab === 'Roles'} onClick={() => setTab('Roles')}>
            Roles
          </TabButton>
        )}
        {roleData?.Edit_Subscription && (
          <TabButton isActive={tab === 'Subscription'} onClick={() => setTab('Subscription')}>
            Subscription
          </TabButton>
        )}
        {(roleData?.Create_Tenants || roleData?.Create_Unit) && (
          <TabButton isActive={tab === 'Import'} onClick={() => setTab('Import')}>
            Import
          </TabButton>
        )}
      </div>

      <DisplayBox className="p-4 sm:p-5 md:p-6">
        {/* Company */}
        {tab === 'Company' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Company</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold opacity-80">Company Name</h3>
                <p className="text-lg mt-1">{loading.company ? '—' : companyName}</p>
                {error.company && <p className="text-sm text-red-300 mt-1">{error.company}</p>}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold opacity-80">Number of Tenants</h3>
                <p className="text-lg mt-1">{loading.company ? '—' : numTenants}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'Users' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl sm:text-2xl font-semibold">Users</h2>

              {/* Show archived toggle */}
              <label className="inline-flex items-center gap-2 text-sm sm:text-base select-none cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-rose-500"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  aria-label="Toggle showing archived users"
                />
                <span className="opacity-90">
                  Show archived{archivedCount ? ` (${archivedCount})` : ''}
                </span>
              </label>
            </div>

            {loading.users ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p>No users found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10">
                {displayedUsers.map((user) => {
                  const profileType = 'User Profile';
                  const archived = isArchived(user);
                  const rowBg = archived ? 'bg-rose-900/10' : '';

                  return (
                    <li key={user.user_id} className={rowBg}>
                      <div className="flex items-center justify-between px-4 py-3 space-x-2">
                        <div className="min-w-0">
                          <p className="text-base font-medium truncate">
                            {user.Name}
                          </p>
                          <p className="text-sm opacity-70 truncate">
                            {user.role}
                            {archived && (
                              <span className="ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-rose-400/40 bg-rose-500/10 text-rose-200">
                                Archived
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/edit_person/edit?id=${user.user_id}&type=${profileType}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                          title="Edit user"
                        >
                          <FiEdit size={18} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {/* Archive / Restore */}
                        <button
                          onClick={() => toggleArchiveUser(user)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                          title={archived ? 'Restore user' : 'Archive user'}
                        >
                          {archived ? <FiRotateCcw size={18} /> : <FiTrash size={18} />}
                          <span className="hidden sm:inline">
                            {archived ? 'Restore' : 'Archive'}
                          </span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {error.users && <p className="text-sm text-red-300 mt-2">{error.users}</p>}
          </div>
        )}

        {/* Roles */}
        {tab === 'Roles' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl sm:text-2xl font-semibold">Roles</h2>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                onClick={() => navigate('/roles')}
              >
                <FiPlus size={18} />
                <span>Create Role</span>
              </button>
            </div>
            {loading.roles ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
              </div>
            ) : roles.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p>No roles yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10">
                {roles.map((role) => (
                  <li key={role.id}>
                    <div className="flex items-center justify-between px-4 py-3 space-x-2">
                      <p className="text-base font-medium">{role.Role_Name}</p>
                      {role.Role_Name !== 'Company Admin' && (
                        <button
                          onClick={() => navigate(`/roles/edit/${role.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                          title="Edit role"
                        >
                          <FiEdit size={18} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {error.roles && <p className="text-sm text-red-300 mt-2">{error.roles}</p>}
          </div>
        )}

        {/* Subscription */}
        {tab === 'Subscription' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Subscription</h2>
            <p className="opacity-80">Coming soon! Currently in testing.</p>
          </div>
        )}

        {/* Import */}
        {tab === 'Import' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-3">
              {importSelected ? `Import ${selectedImport}` : 'Import Tenants or Units'}
            </h2>

            {/* Admin: choose target company */}
            {roleData?.Is_LeaseLink_Admin && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="block text-sm mb-2 opacity-80">Import into Company</label>
                <select
                  className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2"
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                >
                  {allCompanies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
                {!allCompanies.length && (
                  <p className="text-sm opacity-70 mt-2">No companies found or insufficient permissions.</p>
                )}
              </div>
            )}

            {!importSelected && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                  onClick={() => {
                    setImportSelected(true);
                    setSelectedImport('Units');
                    resetImportState();
                  }}
                >
                  <Import className="h-5 w-5" />
                  <span>Units</span>
                </button>
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                  onClick={() => {
                    setImportSelected(true);
                    setSelectedImport('Tenants');
                    resetImportState();
                  }}
                >
                  <Import className="h-5 w-5" />
                  <span>Tenants</span>
                </button>
              </div>
            )}

            {importSelected && (
              <div className="space-y-5">
                {/* Template + switch */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                    onClick={() => {
                      const headers = [
                        ...((EXPECTED[selectedImport]?.required) || []),
                        ...((EXPECTED[selectedImport]?.oneOf?.flat?.() || [])),
                        ...((EXPECTED[selectedImport]?.optional) || []),
                      ];
                      const uniq = Array.from(new Set(headers));
                      const csv = uniq.join(',') + '\n';
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const filename = selectedImport === 'Tenants'
                        ? 'tenant_import_template.csv'
                        : 'unit_import_template.csv';
                      downloadTemplate(blob, filename);
                    }}
                  >
                    <FiDownload className="h-4 w-4" />
                    <span>Download {selectedImport} Template</span>
                  </button>

                  <div className="ml-auto" />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span className="opacity-80">Switch:</span>
                    <select
                      className="rounded-lg bg-white/10 border border-white/15 px-2 py-1"
                      value={selectedImport}
                      onChange={(e) => {
                        setSelectedImport(e.target.value);
                        resetImportState();
                      }}
                    >
                      <option>Tenants</option>
                      <option>Units</option>
                    </select>
                  </label>
                </div>

                {/* File input */}
                <div>
                  <label className="block text-sm mb-2 opacity-80">Upload CSV</label>
                  <input
                    type="file"
                    accept=".csv"
                    className="block w-full text-sm file:mr-4 file:rounded-lg file:border file:border-white/15 file:bg-white/10 file:px-3 file:py-2 file:hover:bg-white/15 file:text-white"
                    onChange={handleCSVChange}
                  />
                  {parsingError && <p className="text-sm text-red-300 mt-2">{parsingError}</p>}
                </div>

                {/* Mapping UI */}
                {csvHeaders.length > 0 && (
                  <div className="space-y-6">
                    {/* REQUIRED */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold opacity-80">
                          Map Required Fields ({selectedImport})
                        </h3>
                        <span
                          className={
                            mappingValid
                              ? 'text-xs rounded-md px-2 py-1 bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                              : 'text-xs rounded-md px-2 py-1 bg-amber-500/15 text-amber-200 border border-amber-400/30'
                          }
                        >
                          {mappingValid ? 'All requirements satisfied' : 'Missing required mappings'}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(EXPECTED[selectedImport]?.required || []).map((exp) => (
                          <label key={exp} className="text-sm">
                            <span className="block mb-1">
                              {exp} <span className="text-rose-300">*</span>
                            </span>
                            <select
                              className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2"
                              value={mapping[exp] ?? ''}
                              onChange={(e) => {
                                const next = { ...mapping, [exp]: e.target.value };
                                setMapping(next);
                                setMappingValid(
                                  computeMappingValid(
                                    next,
                                    csvHeaders,
                                    EXPECTED[selectedImport].required,
                                    EXPECTED[selectedImport].oneOf
                                  )
                                );
                              }}
                            >
                              <option value="">— Select header —</option>
                              {csvHeaders.map((h) => (
                                <option key={`${exp}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ONE-OF GROUPS */}
                    {(EXPECTED[selectedImport]?.oneOf?.length || 0) > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h3 className="text-sm font-semibold opacity-80">At least one of</h3>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(EXPECTED[selectedImport].oneOf || []).map((group, idx) => (
                            <div key={`oneof-${idx}`} className="rounded-lg border border-white/10 p-3">
                              <p className="text-xs opacity-70 mb-2">
                                Select at least one mapping in this group.
                              </p>
                              <div className="grid grid-cols-1 gap-3">
                                {group.map((exp) => (
                                  <label key={exp} className="text-sm">
                                    <span className="block mb-1">{exp} <span className="text-rose-300">*</span></span>
                                    <select
                                      className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2"
                                      value={mapping[exp] ?? ''}
                                      onChange={(e) => {
                                        const next = { ...mapping, [exp]: e.target.value };
                                        setMapping(next);
                                        setMappingValid(
                                          computeMappingValid(
                                            next,
                                            csvHeaders,
                                            EXPECTED[selectedImport].required,
                                            EXPECTED[selectedImport].oneOf
                                          )
                                        );
                                      }}
                                    >
                                      <option value="">— Select header —</option>
                                      {csvHeaders.map((h) => (
                                        <option key={`${exp}-${h}`} value={h}>
                                          {h}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OPTIONAL */}
                    {(EXPECTED[selectedImport]?.optional || []).length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h3 className="text-sm font-semibold opacity-80">Optional Fields</h3>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(EXPECTED[selectedImport]?.optional || []).map((exp) => (
                            <label key={exp} className="text-sm">
                              <span className="block mb-1">{exp}</span>
                              <select
                                className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2"
                                value={mapping[exp] ?? ''}
                                onChange={(e) => setMapping({ ...mapping, [exp]: e.target.value })}
                              >
                                <option value="">(Ignore)</option>
                                {csvHeaders.map((h) => (
                                  <option key={`${exp}-${h}`} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit / Reset */}
                <div className="pt-1">
                  <button
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${mappingValid && csvFile && !importing
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-400/30'
                      : 'bg-white/10 border-white/15 opacity-60 cursor-not-allowed'
                      }`}
                    disabled={!mappingValid || !csvFile || importing}
                    onClick={handleSubmitImport}
                  >
                    <FiPlus className="h-4 w-4" />
                    <span>{importing ? 'Importing…' : 'Submit'}</span>
                  </button>

                  <button
                    className="ml-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                    onClick={() => {
                      resetImportState();
                      const input = document.querySelector('input[type="file"][accept=".csv"]');
                      if (input) input.value = '';
                    }}
                  >
                    <FiRotateCcw className="h-4 w-4" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DisplayBox>
    </div>
  );
};

export default Settings;
