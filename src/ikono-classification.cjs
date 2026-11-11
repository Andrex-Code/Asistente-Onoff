/* Read only the two known classification controls; never search chat content. */
function readClassification(dialog) {
  const blocks = [...dialog.querySelectorAll('.mx_DropdownTypification')];
  if (blocks.length < 1 || blocks.length > 2) return { status: 'unknown', category: '', detail: '' };
  const values = blocks.map(block => {
    if (block.querySelectorAll('[role="combobox"]').length !== 1) return null;
    const selected = [...block.querySelectorAll('.select__single-value')];
    if (selected.length > 1) return null;
    return (selected[0]?.textContent || '').trim().slice(0, 160);
  });
  // Verify the category's visible semantic anchor rather than trusting position alone.
  const label = blocks[0].parentElement.querySelector('label');
  if (label?.textContent.trim() !== 'Tipificación' || values.includes(null)) {
    return { status: 'unknown', category: '', detail: '' };
  }
  const category = values[0];
  const detail = values[1] || '';
  return { status: category && detail ? 'selected' : 'incomplete', category, detail };
}
if (typeof module === 'object' && module.exports) module.exports = { readClassification };
else globalThis.ONOFFIkonoClassification = { readClassification };
