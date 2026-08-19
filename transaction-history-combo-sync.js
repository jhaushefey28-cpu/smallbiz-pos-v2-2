// Keep the main POS sales/transaction-history state synchronized after a Combo/Set sale.
// The Combo/Set checkout already commits atomically through complete_sale_with_bundles.
// This listener refreshes the React app's existing data path instead of duplicating sales inserts.
let refreshing = false;

window.addEventListener('smallbiz:combo-sale-complete', () => {
  if (refreshing) return;
  refreshing = true;

  setTimeout(() => {
    try {
      const buttons = [...document.querySelectorAll('button')];
      const refresh = buttons.find((button) => {
        const text = String(button.textContent || '').trim().toLowerCase();
        return text === 'refresh' || text.includes('refresh');
      });

      if (refresh && !refresh.disabled) {
        refresh.click();
      } else {
        // If the refresh control is not currently mounted, reload the page so the
        // normal authenticated load() path fetches sales history from Supabase.
        window.location.reload();
      }
    } finally {
      setTimeout(() => { refreshing = false; }, 1200);
    }
  }, 950);
});
