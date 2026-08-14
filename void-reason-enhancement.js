(() => {
  const PRESET_REASONS = [
    "Customer Request",
    "Wrong Item",
    "Wrong Quantity",
    "Wrong Price",
    "Duplicate Transaction",
    "Test Transaction",
  ];

  const setReactTextareaValue = (textarea, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    if (setter) setter.call(textarea, value);
    else textarea.value = value;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const enhance = () => {
    document.querySelectorAll(".modal").forEach((modal) => {
      const labels = Array.from(modal.querySelectorAll("label"));
      const reasonLabel = labels.find(
        (label) => label.textContent.trim().toLowerCase() === "void reason"
      );
      if (!reasonLabel) return;

      const textarea = reasonLabel.nextElementSibling;
      if (!(textarea instanceof HTMLTextAreaElement)) return;
      if (textarea.dataset.voidReasonEnhanced === "true") return;

      textarea.dataset.voidReasonEnhanced = "true";
      textarea.style.display = "none";

      const wrapper = document.createElement("div");
      wrapper.dataset.voidReasonUi = "true";
      wrapper.style.display = "grid";
      wrapper.style.gap = "8px";

      const select = document.createElement("select");
      select.setAttribute("aria-label", "Standard void reason");
      select.innerHTML = [
        '<option value="">Select a reason...</option>',
        ...PRESET_REASONS.map((reason) => `<option value="${reason}">${reason}</option>`),
        '<option value="__other__">Other</option>',
      ].join("");

      const otherInput = document.createElement("input");
      otherInput.type = "text";
      otherInput.placeholder = "Enter custom reason...";
      otherInput.style.display = "none";
      otherInput.maxLength = 200;

      const updateReason = (value) => setReactTextareaValue(textarea, value);

      select.addEventListener("change", () => {
        if (select.value === "__other__") {
          otherInput.style.display = "block";
          otherInput.focus();
          updateReason(otherInput.value.trim());
        } else {
          otherInput.style.display = "none";
          updateReason(select.value);
        }
      });

      otherInput.addEventListener("input", () => {
        if (select.value === "__other__") updateReason(otherInput.value.trim());
      });

      wrapper.appendChild(select);
      wrapper.appendChild(otherInput);
      textarea.parentNode.insertBefore(wrapper, textarea);
    });
  };

  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
})();
