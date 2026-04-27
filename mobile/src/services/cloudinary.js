/**
 * CloudinaryService.js — Free alternative for image storage
 * Use this if Firebase Storage has issues or to stay on a free tier.
 */
import { Alert } from 'react-native';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/hiwayti/image/upload';
const UPLOAD_PRESET = 'hiwayti_preset'; // You need to create this in Cloudinary settings (unsigned)

export async function uploadToCloudinary(uri) {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error(data.error?.message || 'Cloudinary upload failed');
    }
  } catch (error) {
    console.error('[CLOUDINARY]', error);
    throw error;
  }
}
