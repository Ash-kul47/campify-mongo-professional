function serializeProof(proof) {
  return {
    filePath: proof.filePath,
    fileType: proof.fileType,
    originalName: proof.originalName,
    url: `/uploads/${proof.filePath.replace(/^uploads[\\/]/, "").replaceAll("\\", "/")}`
  };
}

function serializeComplaint(doc, options = {}) {
  const c = doc.toObject ? doc.toObject() : doc;
  const user = c.userId || {};
  const userId = user._id?.toString?.() || user.toString?.() || c.userId?.toString?.();
  const ticket = options.ticket || {};

  return {
    id: c._id.toString(),
    userId,
    publicId: user.publicId || options.publicId || "anonymous",
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    isTicket: c.isTicket,
    status: c.status,
    priorityScore: options.priorityScore ?? c.priorityScore ?? 0,
    proofs: (c.proofs || []).map(serializeProof),
    upvotes: c.votes?.length || 0,
    hasUpvoted: options.viewerId ? c.votes?.some((v) => v.toString() === options.viewerId) : false,
    ticketDeadline: ticket.ticketDeadline || options.ticketDeadline || null,
    studentName: ticket.studentName,
    studentClass: ticket.studentClass,
    contactEmail: ticket.contactEmail,
    contactNumber: ticket.contactNumber,
    resolutionHours: options.resolutionHours,
    createdAt: c.createdAt,
    resolvedAt: c.resolvedAt
  };
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  return (new Date(end) - new Date(start)) / 3600000;
}

module.exports = { serializeComplaint, hoursBetween };
