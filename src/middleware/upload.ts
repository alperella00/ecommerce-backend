import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "products",
      allowed_formats: ["jpg", "png", "jpeg", "webp"]
    };
  }
});

/** allow only common image types, max 2MB */
const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"]);
export const upload = multer({
  storage, // keep your existing storage (disk or cloudinary)
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("Only JPEG/PNG/WEBP/AVIF images are allowed"));
    }
    cb(null, true);
  }
});

export default upload;