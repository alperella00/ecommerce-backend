import { Schema, model } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  active: boolean;
  sortOrder?: number;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    image: String,
    active: { type: Boolean, default: true },
    sortOrder: Number
  },
  { timestamps: true }
);

export default model<ICategory>("Category", CategorySchema);