import mongoose, { Schema, Document } from "mongoose";

export interface IMembershipPlan extends Document {
  name: string;
  duration: string;
  price: number;
  label: string;
  description: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      default: "NEW PLAN",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError during server reloads
export const MembershipPlan =
  mongoose.models.MembershipPlan ||
  mongoose.model<IMembershipPlan>(
    "MembershipPlan",
    MembershipPlanSchema
  );

export default MembershipPlan;