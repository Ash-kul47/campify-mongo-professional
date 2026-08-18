function calculateComplaintPriority(input) {
  const complaint = input || {};
  let score = 0;

  if (complaint.category === "Safety" || complaint.category === "harassment") {
    score += 40;
  }

  const upvotes = complaint.upvotes ?? complaint.votes?.length ?? 0;
  score += upvotes > 5 ? 20 : upvotes * 3;

  const proofCount = complaint.proofCount ?? complaint.proofs?.length ?? 0;
  if (proofCount > 0) score += 15;

  if (complaint.isOverdue) score += 30;

  if (complaint.ticketDeadline && complaint.status !== "Resolved") {
    if (new Date(complaint.ticketDeadline) < new Date()) score += 30;
  }

  return score;
}

module.exports = calculateComplaintPriority;
