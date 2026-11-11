/* Proposed normalized contract, not an iKono API schema. No I/O or task creation. */
const { assessCapture } = require('./ikono-capture-assessment.cjs');

function assessReview(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { eligibleForHumanReview: false, reasons: ['review_facts_invalid'] };
  }
  const reasons = [];
  const validId = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
  if (!validId(input.attentionId) || !validId(input.snapshotAttentionId) ||
      input.attentionId !== input.snapshotAttentionId || input.identitySourceVerified !== true) {
    reasons.push('attention_identity_not_verified_or_mismatched');
  }
  // Room ID, row number, typification and modal disappearance cannot confirm closure.
  if (input.state !== 'RESUELTO' || input.finalStateVerified !== true) {
    reasons.push('final_resolution_not_verified');
  }
  const timesValid = Number.isSafeInteger(input.startedAtMs) && input.startedAtMs > 0 &&
    Number.isSafeInteger(input.closedAtMs) && input.closedAtMs >= input.startedAtMs;
  if (!timesValid || input.timestampsVerified !== true) reasons.push('attention_timestamps_unverified');
  const classification = input.classification;
  const selected = classification?.status === 'selected' &&
    typeof classification.category === 'string' && classification.category.trim() &&
    typeof classification.detail === 'string' && classification.detail.trim();
  if (!selected) reasons.push('classification_incomplete_or_unsupported');
  let capture;
  try { capture = assessCapture(input.capture || {}); }
  catch { reasons.push('capture_facts_invalid'); }
  if (capture && !capture.usableAsCompleteAttention) reasons.push(...capture.reasons);
  // Even passing this diagnostic only permits preparing human review, never submission.
  return { eligibleForHumanReview: reasons.length === 0, reasons };
}
module.exports = { assessReview };
