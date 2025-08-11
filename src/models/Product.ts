import { Schema, model, Types } from "mongoose";

export interface IProduct {
  name: string;
  slug: string;
  description?: string;
  price: number;
  categoryId: Types.ObjectId;
  images: Array<{ url: string; filename?: string }>;
  tags: string[];
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  stock: number;
  mainImage?: string;
  imageUrl?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    price: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    images: [{ url: { type: String }, filename: { type: String } }],
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    mainImage: { type: String },
    imageUrl: { type: String },
    embedding: { type: [Number], default: undefined }
  },
  { timestamps: true }
);

export default model<IProduct>("Product", ProductSchema);