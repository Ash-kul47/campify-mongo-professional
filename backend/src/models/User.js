const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
      index: true
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true
    }
  },
  { timestamps: true }
);

userSchema.methods.toSessionUser = function toSessionUser() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    publicId: this.publicId
  };
};

module.exports = mongoose.model("User", userSchema);
