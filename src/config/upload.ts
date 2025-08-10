import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = path.parse(file.originalname).name.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${safeBase}${ext}`);
  }
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed (jpg, png, webp, gif)"));
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 } // 5MB, max 5 file
});

export const UPLOADS_PUBLIC_URL = "/uploads";
export const UPLOADS_ABS_DIR = UPLOAD_DIR;