interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  imageData?: {
    filename: string;
    size: string;
    dimensions: string;
    url: string;
    displayUrl: string;
    thumbUrl: string;
  };
  error?: string;
}

export async function uploadImageToFreeHost(file: File): Promise<string> {
  // Create FormData for our API route
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: UploadResponse = await response.json();

    if (!data.success || !data.imageUrl) {
      throw new Error(data.error || 'Failed to upload image');
    }

    return data.imageUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
  }
}

// Convert File to base64 for preview
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Validate image file
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const maxSize = 64 * 1024 * 1024; // 64MB limit as per freeimage.host
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 64MB'
    };
  }

  return { isValid: true };
}
