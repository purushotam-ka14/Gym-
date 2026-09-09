import mongoose, { Schema, Document } from "mongoose";

export interface IFollowUp extends Document {
  memberId: mongoose.Types.ObjectId;
  reason: string;
  note?: string;
  status: "open" | "done";
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpSchema = new Schema<IFollowUp>({
  memberId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reason: { type: String, required: true, trim: true },
  note: { type: String, trim: true },
  status: { type: String, enum: ["open", "done"], default: "open" },
}, { timestamps: true });

export const FollowUp = mongoose.models.FollowUp || mongoose.model<IFollowUp>("FollowUp", FollowUpSchema);
