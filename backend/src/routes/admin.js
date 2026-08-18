const express = require("express");
const Complaint = require("../models/Complaint");
const Ticket = require("../models/Ticket");
const { requireAuth, requireRole } = require("../middleware/auth");
const calculateComplaintPriority = require("../utils/priorityEngine");
const { hoursBetween, serializeComplaint } = require("../utils/serialize");

const router = express.Router();
const adminOnly = [requireAuth, requireRole("admin")];

function buildTicketMap(tickets) {
  return new Map(tickets.map((ticket) => [ticket.complaintId.toString(), ticket]));
}

router.get("/dashboard", adminOnly, async (_req, res, next) => {
  try {
    const [complaints, tickets] = await Promise.all([
      Complaint.find().populate("userId", "publicId").sort({ createdAt: -1 }),
      Ticket.find()
    ]);

    const now = new Date();
    const ticketMap = buildTicketMap(tickets);

    const activeTickets = complaints
      .filter((c) => c.isTicket && c.status !== "Resolved")
      .map((c) => {
        const ticket = ticketMap.get(c._id.toString());
        const priorityScore = calculateComplaintPriority({
          category: c.category,
          proofs: c.proofs,
          votes: c.votes,
          status: c.status,
          ticketDeadline: ticket?.ticketDeadline,
          isOverdue: ticket ? new Date(ticket.ticketDeadline) < now : false
        });
        return serializeComplaint(c, { ticket, priorityScore });
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const resolvedTickets = complaints
      .filter((c) => c.isTicket && c.status === "Resolved")
      .map((c) => serializeComplaint(c, {
        ticket: ticketMap.get(c._id.toString()),
        resolutionHours: Math.round(hoursBetween(c.createdAt, c.resolvedAt) * 100) / 100
      }))
      .sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));

    const normalComplaints = complaints
      .filter((c) => !c.isTicket && c.status !== "Resolved")
      .map((c) => serializeComplaint(c))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const resolvedComplaints = complaints
      .filter((c) => !c.isTicket && c.status === "Resolved")
      .map((c) => serializeComplaint(c, {
        resolutionHours: Math.round(hoursBetween(c.createdAt, c.resolvedAt) * 100) / 100
      }))
      .sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));

    const resolved = complaints.filter((c) => c.resolvedAt);
    const slaMet = resolved.filter((c) => hoursBetween(c.createdAt, c.resolvedAt) <= 48).length;
    const overdueTicketCount = tickets.filter((ticket) => {
      const complaint = complaints.find((c) => c._id.toString() === ticket.complaintId.toString());
      return complaint && complaint.status !== "Resolved" && new Date(ticket.ticketDeadline) < now;
    }).length;

    res.json({
      metrics: {
        totalTickets: tickets.length,
        activeTickets: activeTickets.length,
        overdueTickets: overdueTicketCount,
        activeNormalComplaints: normalComplaints.length,
        avgResolution: resolved.length
          ? resolved.reduce((sum, c) => sum + hoursBetween(c.createdAt, c.resolvedAt), 0) / resolved.length
          : 0,
        slaCompliance: resolved.length ? (slaMet / resolved.length) * 100 : 0,
        overdueRate: tickets.length ? (overdueTicketCount / tickets.length) * 100 : 0
      },
      activeTickets,
      resolvedTickets,
      complaints: normalComplaints,
      resolvedComplaints
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/complaints/:id/status", adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    complaint.status = status;
    complaint.resolvedAt = status === "Resolved" ? new Date() : undefined;
    await complaint.save();
    await complaint.populate("userId", "publicId");

    res.json({ complaint: serializeComplaint(complaint) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
