import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  type: "view";
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: { type: String, enum: ["view"], required: true, default: "view" }
  },
  { timestamps: true }
);

// Son görüntülemeler için yardımcı indeks
ActivitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IActivity>("Activity", ActivitySchema);