// src/components/Profile.jsx

import { useEffect, useState } from 'react';
import { FiEdit } from 'react-icons/fi';
import { get_entity_image } from '../utilities/get_entity_image';
import Spinner from './Spinner';
import { useNavigate } from 'react-router-dom';

/**
 * Profile
 * Displays profile details for an entity and its related entities.
 *
 * Props:
 * - entity: the main entity object to display
 * - session: Supabase session
 * - getFilePath: function to get file path for entity image
 * - getLabel: function to get display name for entity
 * - getRelatedEntity: function to fetch related entity/entities
 * - getRelatedFilePath: function to get file path for related entity image
 * - getRelatedLabel: function to get name of related entity
 * - RelatedTitle: label used for related section (e.g., "Unit(s)")
 * - getRelatedEntityId: function to extract ID for navigation
 * - className: optional Tailwind classes to extend styling
 */
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
  Title = ""
}) => {
  const [image, setImage] = useState('');
  const [relatedEntities, setRelatedEntities] = useState([]);
  const [relatedImages, setRelatedImages] = useState([]);
  const navigate = useNavigate();

  /** Load main entity image */
  useEffect(() => {
    if (!entity || !getFilePath) return;

    const loadImage = async () => {
      const file_path = getFilePath(entity)

      if (file_path != null) {
        const imageUrl = await get_entity_image(file_path, session);
        if (imageUrl) setImage(imageUrl);
      }
    };

    loadImage();
  }, [entity, getFilePath, session]);

  /** Load related entities and their images */
  useEffect(() => {
    if (!entity || !getRelatedEntity) return;

    const fetchRelated = async () => {
      const result = await getRelatedEntity(entity, session);

      const relatedArray = Array.isArray(result)
        ? result
        : result
          ? [result]
          : [];

      setRelatedEntities(relatedArray);

      const images = await Promise.all(
        relatedArray.map((rel) => {
          const file = getRelatedFilePath?.(rel)
          if(file)
          {
          get_entity_image(file, session)
          }
        }
        )
      );

      setRelatedImages(images);
    };

    fetchRelated();
  }, [entity, getRelatedEntity, getRelatedFilePath, session]);

  /** Navigate to related entity’s profile */
  const handleRelatedClick = (related) => {
    const id = getRelatedEntityId(related);

    switch (RelatedTitle) {
      case 'Unit(s)':
        navigate(`/unit/${id}`);
        break;
      case 'Managing Owner':
        navigate(`/owner/${id}`);
        break;
      case 'Property':
        navigate(`/property/${id}`);
        break;
      case 'Tenant(s)':
        navigate(`/tenant/${id}`)
        break;
      default:
        console.warn('Unknown RelatedTitle:', RelatedTitle);
        break;
    }
  };
  const handleEditClick = () => {
    const entityid = getEntityId(entity)

    let url
    if(Title === "Property" || Title === "Unit") url = 'edit_building'
    else url = 'edit_person'
    navigate(`/${url}/edit?id=${entityid}&type=${Title}`);

      
    }
  
  if (!entity) return <Spinner />;

  return (
    <div>
      <div className={`w-full max-w-4xl bg-lease-gradient rounded-lg p-6 flex space-x-10 pb-20 ${className}`}>
        {/* Column 1: Edit Button */}
        <div className="flex flex-col items-start text-white hover:text-gray-200">
          <button onClick={() => handleEditClick()}>
            <FiEdit size={24} />
          </button>
        </div>

        {/* Column 2: Main Entity Image & Label */}
        <div className="flex flex-col items-center justify-center text-center flex-1">
          {Title != "" && (
          <h1 className='text-2xl font-bold text-white underline'>{Title}</h1>
          )}
          {image && (
            <img
              src={image}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4"
            />
          )}
          <div className="text-xl font-semibold text-white">
            {getLabel(entity) || 'Unnamed Entity'}
          </div>
        </div>

        {/* Column 3: Related Entities */}
        <div className="flex flex-col items-start text-white max-w-xs">
          {relatedEntities.length > 0 && (
            <div>
              <div className="text-l font-medium mb-2">
                <u>{RelatedTitle}</u>
              </div>

              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {relatedEntities.map((rel, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    {relatedImages[i] && (
                      <img
                        src={relatedImages[i]}
                        alt="Related"
                        className="w-12 h-12 rounded object-cover border-2 border-white shadow-md"
                      />
                    )}
                    <button
                      className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                      onClick={() => handleRelatedClick(rel)}
                    >
                      {getRelatedLabel(rel)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
