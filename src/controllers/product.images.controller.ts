import { Request, Response } from "express";
import path from "path";
import { UPLOADS_PUBLIC_URL } from "../config/upload";
import Product from "../models/Product"; // mevcut model yolu sende farklıysa düzelt

/* POST /api/v1/products/:id/images  (admin)
 * multipart/form-data  files: images[]
 */
export async function addProductImages(req: Request, res: Response) {
  try {
    const productId = String(req.params.id);
    const files = (req.files as Express.Multer.File[]) || [];

    if (!files.length) return res.status(400).json({ message: "No files uploaded" });

    // public URL'ler
    const images = files.map((f) => ({
      url: path.posix.join(UPLOADS_PUBLIC_URL, path.basename(f.path)),
      filename: path.basename(f.path)
    }));

    // şemanda images alanı yoksa bile ekleyelim; strict update kapatıyoruz
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $push: { images: { $each: images } }, $set: { mainImage: images[0]?.url } },
      { new: true, strict: false }
    );

    if (!updated) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json({ images: updated.images || images, product: updated });
  } catch (err: any) {
    console.error("addProductImages error:", err);
    return res.status(500).json({ message: "Server error", detail: err?.message });
  }
}

/* DELETE /api/v1/products/:id/images
 * body: { filename: "123_name.jpg" }
 * Not: local dosyayı da siler.
 */
export async function removeProductImage(req: Request, res: Response) {
  try {
    const productId = String(req.params.id);
    const { filename } = req.body as { filename?: string };
    if (!filename) return res.status(400).json({ message: "filename required" });

    const prod = await Product.findByIdAndUpdate(
      productId,
      { $pull: { images: { filename } } },
      { new: true, strict: false }
    );
    if (!prod) return res.status(404).json({ message: "Product not found" });

    // local dosyayı temizle
    const fs = await import("fs/promises");
    const pathMod = await import("path");
    const full = pathMod.join(process.cwd(), "uploads", filename);
    try { await fs.unlink(full); } catch {}

    return res.json({ product: prod });
  } catch (err: any) {
    console.error("removeProductImage error:", err);
    return res.status(500).json({ message: "Server error", detail: err?.message });
  }
}