/* Sale Details modal reprint bridge.
 * The main transaction table already has a fully implemented historical
 * reprint action. This small UI bridge exposes that same action inside the
 * Sale Details modal without duplicating receipt-generation logic.
 */
(function () {
  "use strict";

  const SELECTOR = ".sale-details-modal";
  const BUTTON_CLASS = "sale-details-reprint-btn";

  function textOf(el) {
    return String(el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findInvoice(modal) {
    const paragraphs = Array.from(modal.querySelectorAll("p"));
    const line = paragraphs.find((p) => /Invoice\s*:/i.test(textOf(p)));
    if (!line) return "";
    return textOf(line).replace(/^Invoice\s*:\s*/i, "").trim();
  }

  function findTransactionReprintButton(invoice) {
    if (!invoice) return null;

    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (!cells.length) continue;
      if (textOf(cells[0]) !== invoice) continue;

      const buttons = Array.from(row.querySelectorAll("button"));
      return buttons.find((button) => /Reprint/i.test(textOf(button))) || null;
    }
    return null;
  }

  function addButton(modal) {
    if (!modal || modal.querySelector(`.${BUTTON_CLASS}`)) return;

    const invoice = findInvoice(modal);
    if (!invoice) return;

    const sourceButton = findTransactionReprintButton(invoice);
    if (!sourceButton) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = "🖨️ Reprint Receipt";
    button.title = "Reprint this historical transaction receipt";

    button.addEventListener("click", function () {
      sourceButton.click();
    });

    const header = modal.querySelector(".modal-header");
    const closeButton = header?.querySelector("button");

    if (header && closeButton) {
      button.style.marginLeft = "auto";
      button.style.marginRight = "8px";
      header.insertBefore(button, closeButton);
      return;
    }

    modal.insertBefore(button, modal.firstChild);
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(addButton);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
})();
