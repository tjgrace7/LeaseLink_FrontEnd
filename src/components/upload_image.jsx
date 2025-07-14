// src/components/UploadImage.jsx

import { useState } from 'react';

/**
 * UploadImage
 * Allows a user to select an image file, displays a preview,
 * and passes the selected file to the parent via `onImageSelect`.
 *
 * Props:
 * - onImageSelect: function to handle the selected image file
 */
const UploadImage = ({ onImageSelect }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result); // Set image preview URL
    };
    reader.readAsDataURL(file);

    // Pass file to parent
    onImageSelect(file);
  };

  return (
    <div className="flex flex-col items-start space-y-2">
      {/* File input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block"
      />

      {/* Image preview */}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          className="w-32 h-32 object-cover rounded border"
        />
      )}
    </div>
  );
};

export default UploadImage;
