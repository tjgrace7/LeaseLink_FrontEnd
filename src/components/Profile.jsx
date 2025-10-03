// src/components/Profile.jsx
import { useEffect, useMemo, useState, memo } from 'react';
import { FiDelete, FiEdit, FiRotateCcw, FiTrash } from 'react-icons/fi';
import { get_entity_image } from '../utilities/get_entity_image';
import Spinner from './Spinner';
import { useNavigate } from 'react-router-dom';
import { ArchiveEntity, UnarchiveEntity } from '../utilities/Generic';
import ConfirmPopUp from './Confirm';
import { nav } from 'framer-motion/client';

const Profile = ({
  entity,
  getEntityId,
  session,
  getFilePath,
  getLabel,
  getRelatedEntity,
  getRelatedFilePath,
  getRelatedLabel,
  RelatedTitle,
  getRelatedEntityId,
  className = '',
  Title = '',
  edit_Entity = false,
  delete_Entity = false
}) => {
  const [image, setImage] = useState('');
  const [entityId, setEntityId] = useState('');
  const [relatedEntities, setRelatedEntities] = useState([]);
  const [relatedImages, setRelatedImages] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const navigate = useNavigate();

  const relatedRouteBase = useMemo(() => {
    switch (RelatedTitle) {
      case 'Unit(s)': return '/unit';
      case 'Managing Owner': return '/owner';
      case 'Property': return '/property';
      case 'Tenant(s)': return '/tenant';
      default: return null;
    }
  }, [RelatedTitle]);

  // keep behavior but add dependency to avoid extra re-renders
  useEffect(() => {
    if (!entity || !getEntityId) return;
    setEntityId(getEntityId(entity));
  }, [entity, getEntityId]);

  // -------- Main entity image
  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      if (!entity || !getFilePath) return;
      try {
        const filePath = getFilePath(entity);
        if (!filePath) {
          setImage('');
          return;
        }
        const imageUrl = await get_entity_image(filePath, session);
        if (!cancelled) setImage(imageUrl || '');
      } catch {
        if (!cancelled) setImage('');
      }
    };
    loadImage();
    return () => { cancelled = true; };
  }, [entity, getFilePath, session]);

  // -------- Related entities + images
  useEffect(() => {
    let cancelled = false;
    const fetchRelated = async () => {
      if (!entity || !getRelatedEntity) {
        setRelatedEntities([]);
        setRelatedImages([]);
        return;
      }
      setLoadingRelated(true);
      try {
        const result = await getRelatedEntity(entity, session);
        const arr = Array.isArray(result) ? result : result ? [result] : [];
        if (cancelled) return;
        setRelatedEntities(arr);

        const images = await Promise.all(
          arr.map(async (rel) => {
            try {
              const file = getRelatedFilePath?.(rel);
              if (!file) return '';
              const url = await get_entity_image(file, session);
              return url || '';
            } catch {
              return '';
            }
          })
        );
        if (!cancelled) setRelatedImages(images);
      } finally {
        if (!cancelled) setLoadingRelated(false);
      }
    };
    fetchRelated();
    return () => { cancelled = true; };
  }, [entity, getRelatedEntity, getRelatedFilePath, session]);

  const handleRelatedClick = (related) => {
    if (!relatedRouteBase || !getRelatedEntityId) return;
    const id = getRelatedEntityId(related);
    if (!id) return;
    navigate(`${relatedRouteBase}/${id}`);
  };

  const handleEditClick = () => {
    if (!entityId) return;
    const url = Title === 'Property' || Title === 'Unit' ? 'edit_building' : 'edit_person';
    navigate(`/${url}/edit?id=${entityId}&type=${Title}`);
  };

  // Determine archived state (allowing for stringy truthy values)
  const isArchived = useMemo(() => {
    const v = entity?.archived;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === 't' || s === '1' || s === 'yes';
    }
    return !!v;
  }, [entity]);

  const handleArchive = () => {
    let message = '';
    switch (Title) {
      case 'Property':
        message = 'Archiving Property will also archive all tenants and units in the property.';
        break;
      case 'Unit':
        message = 'Archiving Unit will also archive all Tenants inside of the Unit.';
        break;
      case 'Tenant':
        message = 'Are you sure you want to archive this tenant?';
        break;
      default:
        message = 'Are you sure?';
    }

    setConfirmData({
      title: `Archive ${Title}?`,
      message,
      mode: 'archive',
    });
  };

  const handleRestore = () => {
    setConfirmData({
      title: `Restore ${Title}?`,
      message: `This will unarchive the ${Title.toLowerCase()}.`,
      mode: 'restore',
    });
  };

  if (!entity) return <Spinner />;

  const hasRelated = (relatedEntities?.length || 0) > 0;

  const loadChat = (tenant) => {

    if(!entityId ) return;
    console.log(tenant.Tenant_Name)
    console.log(Title)
    console.log(entityId)
    localStorage.setItem("chat_session_id", crypto.randomUUID());
    localStorage.setItem('entity_id', entityId);
    localStorage.setItem('entity_type', Title.toLowerCase());
    localStorage.setItem('entity_selected', 'true')
    localStorage.setItem('isNewNavigation', 'true')
    localStorage.setItem('entity_name', tenant.Tenant_Name)
    navigate('/chat')
  }

  return (
    <div
      className={[
        'relative w-full self-stretch rounded-lg',
        'bg-lease-gradient text-white',
        'p-4 sm:p-6',
        edit_Entity
          ? (hasRelated
            ? 'grid grid-cols-[auto_1.5fr_1fr] items-start'
            : 'grid grid-cols-[auto_1fr] items-start')
          : (hasRelated
            ? 'grid grid-cols-[1.5fr_1fr] items-start'
            : 'grid grid-cols-1'),
        'gap-6 sm:gap-8',
        className,
      ].join(' ')}
    >
      {/* Edit button column (only when edit_Entity) */}
      <div className="flex flex-col space-y-2">
        {edit_Entity && (
          <>
            {/* Mobile FAB */}
            <button
              onClick={handleEditClick}
              aria-label={`Edit ${Title || 'entity'}`}
              title="Edit"
              className="md:hidden absolute top-3 right-3 inline-flex items-center justify-center rounded-full p-3 ring-1 ring-inset ring-white/15 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white backdrop-blur"
            >
              <FiEdit size={20} />
            </button>

            {/* Desktop icon column */}
            <div className="hidden md:flex flex-col items-start place-self-start">
              <button
                onClick={handleEditClick}
                aria-label={`Edit ${Title || 'entity'}`}
                title="Edit"
                className="inline-flex items-center justify-center rounded-xl p-2 ring-1 ring-inset ring-white/15 hover:bg-white/10"
              >
                <FiEdit size={22} />
              </button>
            </div>
          </>
        )}

        {delete_Entity && (
          <>
            {/* Mobile FAB */}
            <button
              onClick={isArchived ? handleRestore : handleArchive}
              aria-label={`${isArchived ? 'Restore' : 'Archive'} ${Title || 'entity'}`}
              title={isArchived ? 'Restore' : 'Archive'}
              className="md:hidden absolute top-3 right-3 inline-flex items-center justify-center rounded-full p-3 ring-1 ring-inset ring-white/15 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white backdrop-blur"
            >
              {!isArchived && (<FiTrash size={20} />)}
              {isArchived && (<FiRotateCcw size={20} />)}
            </button>

            {/* Desktop icon column */}
            <div className="hidden md:flex flex-col items-start place-self-start">
              <button
                onClick={isArchived ? handleRestore : handleArchive}
                aria-label={`${isArchived ? 'Restore' : 'Archive'} ${Title || 'entity'}`}
                title={isArchived ? 'Restore' : 'Archive'}
                className="inline-flex items-center justify-center rounded-xl p-2 ring-1 ring-inset ring-white/15 hover:bg-white/10"
              >
                {!isArchived && (<FiTrash size={22} />)}
                {isArchived && (<FiRotateCcw size={22} />)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main entity column */}
      <div className="flex flex-col items-center justify-center text-center md:col-start-2">
        {Title && (
          <h1 className="text-xl sm:text-2xl font-bold underline underline-offset-4 decoration-white/30">
            {Title}
          </h1>
        )}

        {image && (
          <div className="mt-3 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/80 shadow-md overflow-hidden">
            <img
              src={image}
              alt={`${Title || 'Profile'} image`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="mt-2 text-lg sm:text-xl font-semibold max-w-full">
          <span className="block truncate">{getLabel?.(entity) || 'Unnamed Entity'}</span>
        </div>
      </div>

      {/* Related entities column — render only if present to avoid empty space */}
      {hasRelated && (
        <div className="flex flex-col items-start">
          <div className="w-full">
            <div className="text-base sm:text-lg font-medium mb-2">
              <span className="underline underline-offset-4 decoration-white/30">
                {RelatedTitle}
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4 max-h-64 overflow-y-auto pr-1 sm:pr-2 custom-scroll">
              {loadingRelated ? (
                <div className="text-white/80 text-sm">Loading…</div>
              ) : (
                relatedEntities.map((rel, i) => {
                  const keyCandidate =
                    (getRelatedEntityId && getRelatedEntityId(rel)) ||
                    `${getRelatedLabel?.(rel) || 'related'}-${i}`;
                  const imgUrl = relatedImages[i];

                  return (
                    <div key={keyCandidate} className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {imgUrl && (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-white/80 shadow-md overflow-hidden flex-shrink-0">
                          <img
                            src={imgUrl}
                            alt={`${getRelatedLabel?.(rel) || 'Related'} image`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}

                      <button
                        className="w-0 flex-1 max-w-full cursor-pointer rounded-lg sm:rounded-xl text-left px-2 py-2 sm:px-3 sm:py-2 ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition min-w-0"
                        onClick={() => handleRelatedClick(rel)}
                        title={getRelatedLabel?.(rel) || 'Unnamed'} // nice tooltip for full text
                      >
                        <span className="block min-w-0 max-w-full text-sm sm:text-base line-clamp-2 break-words">
                          {getRelatedLabel?.(rel) || 'Unnamed'}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {(Title === 'Unit' || Title === 'Property') && (
              <div className="flex flex-col mt-4 gap-2">
                <h2 className="text-sm sm:text-base font-semibold underline underline-offset-4 decoration-white/30">
                  Add Entities
                </h2>
                <button
                  onClick={() => navigate('/create_person')}
                  className="mt-1 cursor-pointer rounded-lg sm:rounded-xl px-3 py-2 text-left ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition text-sm sm:text-base"
                >
                  Create Tenant
                </button>
                {Title === 'Property' && (
                  <button
                    onClick={() => navigate('/create_building')}
                    className="cursor-pointer rounded-lg sm:rounded-xl px-3 py-2 text-left ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition text-sm sm:text-base"
                  >
                    Create Unit
                  </button>
                )}
              </div>
            )}
            {console.log(Title)}
            {(Title === 'Tenant') && (
              <div className="flex flex-col mt-4 gap-2">
                <h2 className="text-sm sm:text-base font-semibold underline underline-offset-4 decoration-white/30">
                  Create Chat
                </h2>
                <button
                  onClick={() => loadChat(entity)}
                  className="mt-1 cursor-pointer rounded-lg sm:rounded-xl px-3 py-2 text-left ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition text-sm sm:text-base"
                >
                  New Chat
                </button>
                
              </div>
            )}
          </div>
        </div>
      )}

      {confirmData && (
        <ConfirmPopUp
          title={confirmData.title}
          message={confirmData.message}
          onConfirm={async () => {
            if (confirmData.mode === 'restore') {
              await UnarchiveEntity(Title, entityId);
            } else {
              await ArchiveEntity(Title, entityId);
            }
            setConfirmData(null); // close popup
            navigate('/dashboard');
          }}
          onCancel={() => setConfirmData(null)}
        />
      )}

      {/* Small custom scrollbar */}
      <style>{`
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 9999px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default memo(Profile);
