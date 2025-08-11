import { Schema, model, Types } from "mongoose";

export interface IUserAddress {
  fullName?: string;
  line1: string;
  line2?: string;
  city: string;
  country: string;
  postalCode?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface IUser {
  email: string;
  passwordHash: string;
  role: "admin" | "customer";
  firstName?: string;
  lastName?: string;
  phone?: string;

  // verification & reset
  emailVerified: boolean;
  verificationToken?: string | null;
  verificationExpires?: Date | null;
  resetToken?: string | null;
  resetExpires?: Date | null;

  // profile extras
  addresses: IUserAddress[];
  favoriteCategoryIds: Types.ObjectId[];
}

const AddressSchema = new Schema<IUserAddress>(
  {
    fullName: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: String,
    phone: String,
    isDefault: { type: Boolean, default: false }
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer", index: true },
    firstName: String,
    lastName: String,
    phone: String,

    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationExpires: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetExpires: { type: Date, default: null },

    passwordResetTokenHash: { type: String },
    passwordResetExpires: { type: Date },

    addresses: { type: [AddressSchema], default: [] },
    favoriteCategoryIds: { type: [Schema.Types.ObjectId], ref: "Category", default: [] }
  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);