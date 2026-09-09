import mongoose, { Document, Schema } from "mongoose";

export interface IAttendance extends Document {
  memberId: mongoose.Types.ObjectId;
  checkedInAt: Date;
  checkedOutAt?: Date;
  checkInMethod: "qr" | "manual";
  checkOutMethod?: "qr" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    checkedInAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    checkedOutAt: {
      type: Date,
    },

    checkInMethod: {
      type: String,
      enum: ["qr", "manual"],
      default: "qr",
    },

    checkOutMethod: {
      type: String,
      enum: ["qr", "manual"],
    },
  },
  {
    timestamps: true,
  }
);

export const Attendance =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;