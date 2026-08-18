const express = require("express");
const Complaint = require("../models/Complaint");
const Ticket = require("../models/Ticket");
const { requireAuth, requireRole } = require("../middleware/auth");
const calculateComplaintPriority = require("../utils/priorityEngine");
const { serializeComplaint } = require("../utils/serialize");
const upload = require("../utils/upload");

const router = express.Router();
const studentOnly = [requireAuth, requireRole("student")];

function proofFromFile(file) {
  if (!file) return [];
  return [{
    filePath: `uploads/proofs/${file.filename}`,
    fileType: file.mimetype,
    originalName: file.originalname
  }];
}

router.get("/dashboard", studentOnly, async (req, res, next) => {
  try {
    const viewerId = req.session.user.id;
    const [mine, all, myTicketComplaints, tickets] = await Promise.all([
      Complaint.find({ userId: viewerId, isTicket: false }).populate("userId", "publicId").sort({ createdAt: -1 }),
      Complaint.find({ isTicket: false }).populate("userId", "publicId").sort({ priorityScore: -1, createdAt: -1 }),
      Complaint.find({ userId: viewerId, isTicket: true }).populate("userId", "publicId").sort({ createdAt: -1 }),
      Ticket.find()
    ]);

    const ticketMap = new Map(tickets.map((t) => [t.complaintId.toString(), t]));

    res.json({
      user: req.session.user,
      complaints: mine.map((c) => serializeComplaint(c, { viewerId })),
      allComplaints: all.map((c) => serializeComplaint(c, { viewerId })),
      myTickets: myTicketComplaints.map((c) => serializeComplaint(c, { viewerId, ticket: ticketMap.get(c._id.toString()) }))
    });
  } catch (err) {
    next(err);
  }
});

router.post("/complaints", studentOnly, upload.single("proof"), async (req, res, next) => {
  try {
    const { title, description, category, location } = req.body;
    const proofs = proofFromFile(req.file);
    const priorityScore = calculateComplaintPriority({ category, proofs });

    const complaint = await Complaint.create({
      title,
      description,
      category,
      location,
      userId: req.session.user.id,
      isTicket: false,
      proofs,
      priorityScore
    });

    await complaint.populate("userId", "publicId");
    res.status(201).json({ complaint: serializeComplaint(complaint, { viewerId: req.session.user.id }) });
  } catch (err) {
    next(err);
  }
});

router.post("/tickets", studentOnly, upload.single("proof"), async (req, res, next) => {
  try {
    const activeTicket = await Complaint.findOne({
      userId: req.session.user.id,
      isTicket: true,
      status: { $in: ["Pending", "In Progress"] }
    });

    if (activeTicket) {
      return res.status(400).json({ message: "You already have an active ticket" });
    }

    const { title, description, category, location, studentName, studentClass, contactEmail, contactNumber } = req.body;
    const proofs = proofFromFile(req.file);
    const ticketDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const priorityScore = calculateComplaintPriority({ category, proofs, ticketDeadline });

    const complaint = await Complaint.create({
      title,
      description,
      category,
      location,
      userId: req.session.user.id,
      isTicket: true,
      proofs,
      priorityScore
    });

    const ticket = await Ticket.create({
      complaintId: complaint._id,
      studentName,
      studentClass,
      contactEmail,
      contactNumber,
      ticketDeadline
    });

    await complaint.populate("userId", "publicId");
    res.status(201).json({ ticket: serializeComplaint(complaint, { viewerId: req.session.user.id, ticket }) });
  } catch (err) {
    next(err);
  }
});

router.post("/complaints/:id/upvote", studentOnly, async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, isTicket: false });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (complaint.userId.toString() === req.session.user.id) {
      return res.status(400).json({ message: "You cannot upvote your own complaint" });
    }

    const voteIndex = complaint.votes.findIndex((id) => id.toString() === req.session.user.id);
    if (voteIndex >= 0) complaint.votes.splice(voteIndex, 1);
    else complaint.votes.push(req.session.user.id);

    complaint.priorityScore = calculateComplaintPriority({
      category: complaint.category,
      votes: complaint.votes,
      proofs: complaint.proofs
    });
    await complaint.save();
    await complaint.populate("userId", "publicId");

    res.json({ complaint: serializeComplaint(complaint, { viewerId: req.session.user.id }) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
