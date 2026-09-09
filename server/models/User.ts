import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string; email: string; password: string; role: "member" | "owner"; phone?: string; membershipPlan?: string; membershipStartDate?: Date; membershipEndDate?: Date; createdAt: Date; updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ["member", "owner"], default: "member" },
  phone: { type: String, trim: true },
  membershipPlan: { type: String, trim: true },
  membershipStartDate: { type: Date },
  membershipEndDate: { type: Date },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
