const mongoose = require("mongoose");

const proofSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true },
    fileType: { type: String, required: true },
    originalName: { type: String, trim: true }
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: {
      type: String,
      required: true,
      enum: ["Infrastructure", "Academics", "Hostel", "Safety", "IT / ERP", "Other"],
      index: true
    },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isTicket: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
      index: true
    },
    priorityScore: { type: Number, default: 0, index: true },
    proofs: [proofSchema],
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    resolvedAt: Date
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, isTicket: 1, priorityScore: -1 });
complaintSchema.index({ userId: 1, isTicket: 1, status: 1 });

module.exports = mongoose.model("Complaint", complaintSchema);
