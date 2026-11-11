/* Diagnostic only. No messages, identifiers, network, storage or task creation. */
function assessCapture(facts) {
  const { eligibleCount, retainedCount } = facts;
  if (!Number.isSafeInteger(eligibleCount) || eligibleCount < 0 ||
      !Number.isSafeInteger(retainedCount) || retainedCount < 0 || retainedCount > eligibleCount) {
    throw new TypeError('Invalid capture counts');
  }
  const omittedCount = eligibleCount - retainedCount;
  const reasons = [];
  if (facts.attentionIdentityVerified !== true) reasons.push('attention_identity_unverified');
  if (facts.attentionBoundariesVerified !== true) reasons.push('attention_boundaries_unverified');
  if (facts.historyCompletenessVerified !== true) reasons.push('history_completeness_unverified');
  if (facts.domWindowChanged === true) reasons.push('dom_window_changed');
  if (omittedCount) reasons.push('capture_limit_omits_messages');
  if (eligibleCount === 0) reasons.push('empty_capture');
  // A full room snapshot can still contain multiple attentions. Room identity is insufficient.
  const coverage = omittedCount ? 'partial' :
    facts.historyCompletenessVerified === true && facts.attentionBoundariesVerified === true ? 'verified' : 'unknown';
  return { eligibleCount, retainedCount, omittedCount, coverage,
    usableAsCompleteAttention: reasons.length === 0, reasons };
}
module.exports = { assessCapture };
