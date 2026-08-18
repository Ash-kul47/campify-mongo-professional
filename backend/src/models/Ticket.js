const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      unique: true,
      index: true
    },
    studentName: { type: String, required: true, trim: true, maxlength: 100 },
    studentClass: { type: String, required: true, trim: true, maxlength: 100 },
    contactEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    contactNumber: { type: String, required: true, trim: true, maxlength: 20 },
    ticketDeadline: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
