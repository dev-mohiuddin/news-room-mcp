import { v2 as cloudinary } from "cloudinary";

const cloudNamePattern = /^[a-z0-9_-]+$/;

export const validateCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
    );
  }

  if (!cloudNamePattern.test(cloudName)) {
    throw new Error("Invalid CLOUDINARY_CLOUD_NAME — use lowercase from your Cloudinary dashboard");
  }

  return { cloudName, apiKey, apiSecret };
};

export const configureCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = validateCloudinaryConfig();
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
};

/**
 * Upload a Buffer (from multer.memoryStorage) to Cloudinary.
 * Returns the secure URL + public_id.
 */
export const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "newsroom-mcp",
        resource_type: options.resourceType || "auto",
        ...options,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

export const deleteFromCloudinary = (publicId, options = {}) =>
  cloudinary.uploader.destroy(publicId, options);

export { cloudinary };
