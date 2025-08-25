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

  /** Load main entity image */
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

  /** Load related entities and their images */
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

  return (
    <div
      className={[
        // Container
        'relative w-full !max-w-none self-stretch rounded-lg p-4 sm:p-6 pb-24 sm:pb-20',
        'bg-lease-gradient min-h-[260px]',
        // Layout: 1 col on mobile; add columns on >= md
        edit_Entity
          ? 'grid grid-cols-1 md:grid-cols-[auto_1.6fr_1fr]'
          : 'grid grid-cols-1 md:grid-cols-[1.6fr_1fr]',
        'gap-6 sm:gap-8 items-start',
        className,
      ].join(' ')}
    >
      {/* Edit button — mobile: floating top-right; desktop: left column */}
      {edit_Entity && (
        <>
          {/* Mobile (md:hidden): floating FAB */}
          <button
            onClick={handleEditClick}
            aria-label={`Edit ${Title || 'entity'}`}
            title="Edit"
            className="md:hidden absolute top-3 right-3 inline-flex items-center justify-center rounded-full p-3 ring-1 ring-inset ring-white/15 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white backdrop-blur"
          >
            <FiEdit size={20} />
          </button>

          {/* Desktop (md:flex): left column icon */}
          <div className="hidden md:flex flex-col items-start text-white hover:text-gray-200 place-self-start">
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

      {/* Main entity */}
      <div className="flex flex-col items-center md:items-start justify-start text-center md:text-left gap-2">
        {Title ? (
          <h1 className="text-xl sm:text-2xl font-bold text-white underline underline-offset-4 decoration-white/30">
            {Title}
          </h1>
        ) : null}

        {/* Only show image container if image exists */}
        {image && (
          <div className="mt-1 sm:mt-2 w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/80 shadow-md overflow-hidden">
            <img
              src={image}
              alt={`${Title || 'Profile'} image`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div className="mt-2 text-lg sm:text-xl font-semibold text-white max-w-full">
          <span className="block truncate">{getLabel?.(entity) || 'Unnamed Entity'}</span>
        </div>
      </div>

      {/* Related entities */}
      <div className="flex flex-col items-start text-white">
        {(relatedEntities?.length || 0) > 0 && (
          <div className="w-full">
            <div className="text-base sm:text-lg font-medium mb-2">
              <span className="underline underline-offset-4 decoration-white/30">
                {RelatedTitle}
              </span>
            </div>

            {/* Scroll area with comfortable touch targets */}
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
                      {/* Only show image container if image exists */}
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

            {/* Quick actions */}
            <div className="flex flex-col mt-4 gap-2">
              {(Title === 'Unit' || Title === 'Property') && (
                <div>
                  <h2 className="text-sm sm:text-base font-semibold underline underline-offset-4 decoration-white/30">
                    Add Entities
                  </h2>
                  <button
                    onClick={() => navigate('/create_person')}
                    className="mt-1 cursor-pointer rounded-lg sm:rounded-xl px-3 py-2 text-left ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition text-sm sm:text-base"
                  >
                    Create Tenant
                  </button>
                </div>
              )}
              {Title === 'Property' && (
                <button
                  onClick={() => navigate('/create_building')}
                  className="cursor-pointer rounded-lg sm:rounded-xl px-3 py-2 text-left ring-1 ring-inset ring-white/10 hover:bg-white/10 active:bg-white/15 transition text-sm sm:text-base"
                >
                  Create Unit
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Small custom scrollbar for WebKit (optional) */}
      <style>{`
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 9999px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default memo(Profile);
