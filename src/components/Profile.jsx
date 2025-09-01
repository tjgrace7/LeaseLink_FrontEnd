// src/components/Profile.jsx
import { useEffect, useMemo, useState, memo } from 'react';
import { FiEdit } from 'react-icons/fi';
import { get_entity_image } from '../utilities/get_entity_image';
import Spinner from './Spinner';
import { useNavigate } from 'react-router-dom';

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
}) => {
  const [image, setImage] = useState('');
  const [relatedEntities, setRelatedEntities] = useState([]);
  const [relatedImages, setRelatedImages] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

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
    if (!entity || !getEntityId) return;
    const entityId = getEntityId(entity);
    if (!entityId) return;
    const url = Title === 'Property' || Title === 'Unit' ? 'edit_building' : 'edit_person';
    navigate(`/${url}/edit?id=${entityId}&type=${Title}`);
  };

  if (!entity) return <Spinner />;

  const hasRelated = (relatedEntities?.length || 0) > 0;

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
                    <div key={keyCandidate} className="flex items-center gap-2 sm:gap-3">
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
                        className="flex-1 cursor-pointer rounded-lg sm:rounded-xl text-left px-2 py-2 sm:px-3 sm:py-2 ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition"
                        onClick={() => handleRelatedClick(rel)}
                      >
                        <span className="block text-sm sm:text-base truncate">
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
          </div>
        </div>
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
