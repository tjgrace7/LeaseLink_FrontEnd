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
      className={`w-full !max-w-none self-stretch bg-lease-gradient rounded-lg p-6 pb-20
      grid ${edit_Entity ? 'grid-cols-[auto_2fr_1fr]' : 'grid-cols-[2fr_1fr]'}
      gap-8 items-start min-h-[260px] ${className}`}
    >
      {/* Col 1: Edit button */}
      {edit_Entity && (
        <div className="flex flex-col items-start text-white hover:text-gray-200 place-self-start">
          <button onClick={handleEditClick} aria-label={`Edit ${Title || 'entity'}`} title="Edit">
            <FiEdit size={24} />
          </button>
        </div>
      )}

      {/* Col 2: Main entity */}
      <div className="flex flex-col items-center justify-start text-center gap-2">
        {Title ? <h1 className="text-2xl font-bold text-white underline">{Title}</h1> : null}

        {/* Only show image container if image exists */}
        {image && (
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-md mb-2 overflow-hidden">
            <img
              src={image}
              alt={`${Title || 'Profile'} image`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="text-xl font-semibold text-white">
          {getLabel?.(entity) || 'Unnamed Entity'}
        </div>
      </div>

      {/* Col 3: Related entities */}
      <div className="flex flex-col items-start text-white">
        {(relatedEntities?.length || 0) > 0 && (
          <div className="w-full">
            <div className="text-l font-medium mb-2">
              <u>{RelatedTitle}</u>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {loadingRelated ? (
                <div className="text-white/80 text-sm">Loading…</div>
              ) : (
                relatedEntities.map((rel, i) => {
                  const keyCandidate =
                    (getRelatedEntityId && getRelatedEntityId(rel)) ||
                    `${getRelatedLabel?.(rel) || 'related'}-${i}`;
                  return (
                    <div key={keyCandidate} className="flex items-center space-x-2">
                      {/* Only show image container if image exists */}
                      {relatedImages[i] && (
                        <div className="w-12 h-12 rounded border-2 border-white shadow-md overflow-hidden flex-shrink-0">
                          <img
                            src={relatedImages[i]}
                            alt={`${getRelatedLabel?.(rel) || 'Related'} image`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <button
                        className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left flex-1"
                        onClick={() => handleRelatedClick(rel)}
                      >
                        {getRelatedLabel?.(rel) || 'Unnamed'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col mt-4">
              {(Title === 'Unit' || Title === 'Property') && (
                <div>
                  <h2 className="underline">Add Entities</h2>
                  <button
                    onClick={() => navigate('/create_person')}
                    className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                  >
                    Create Tenant
                  </button>
                </div>
              )}
              {Title === 'Property' && (
                <button
                  onClick={() => navigate('/create_building')}
                  className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                >
                  Create Unit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Profile);