import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  qty: number;
  // snapshots to avoid price/name drift between cart and time of order
  nameSnapshot: string;
  priceSnapshot: number;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true, min: 1, default: 1 },
  nameSnapshot: { type: String, required: true },
  priceSnapshot: { type: Number, required: true }
});

const CartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    items: [CartItemSchema]
  },
  { timestamps: true }
);

CartSchema.index({ user: 1 });

export default mongoose.model<ICart>("Cart", CartSchema);