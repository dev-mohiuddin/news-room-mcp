import { v2 as cloudinary } from "cloudinary";

const cloudNamePattern = /^[a-z0-9_-]+$/;

export const validateCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env"
    );
  }

  if (!cloudNamePattern.test(cloudName)) {
    throw new Error(
      "Invalid CLOUDINARY_CLOUD_NAME. Use your active lowercase Cloudinary cloud name from the dashboard"
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
  };
};

export const configureCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = validateCloudinaryConfig();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
};

export { cloudinary };
