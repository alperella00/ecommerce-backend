import mongoose, { Schema, Document } from "mongoose";

export interface IAISession extends Document {
  user?: mongoose.Types.ObjectId | null;
  sessionId: string;
  history: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  filters?: Record<string, any>;
}

const AISessionSchema = new Schema<IAISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: false },
    sessionId: { type: String, required: true, unique: true, index: true },
    history: [{ role: { type: String }, content: { type: String } }],
    filters: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export default mongoose.model<IAISession>("AISession", AISessionSchema);