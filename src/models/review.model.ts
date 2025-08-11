import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number; // 1..5
  comment?: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    approved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Tek kullanıcının aynı ürüne birden fazla review bırakmasını engelle (isteğe bağlı)
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", ReviewSchema);