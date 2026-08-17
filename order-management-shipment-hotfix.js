// SmallBiz POS: make shipment writes idempotent.
// order_shipments has one row per (business_id, external_order_id), so a retry
// should update the existing shipment instead of surfacing a duplicate-key error.
(() => {
  if (window.__smallbizShipmentUpsertHotfix) return;
  window.__smallbizShipmentUpsertHotfix = true;

  const nativeFetch = window.fetch.bind(window);

  function isShipmentInsert(url, method) {
    return method === "POST" && /\/rest\/v1\/order_shipments(?:\?|$)/.test(url);
  }

  window.fetch = (input, init = {}) => {
    const rawUrl = typeof input === "string" ? input : input?.url;
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    if (!rawUrl || !isShipmentInsert(rawUrl, method)) {
      return nativeFetch(input, init);
    }

    const url = new URL(rawUrl, window.location.href);
    url.searchParams.set("on_conflict", "business_id,external_order_id");

    const incoming = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers || {}).forEach((value, key) => incoming.set(key, value));

    const prefer = incoming.get("Prefer") || "";
    const parts = prefer.split(",").map(v => v.trim()).filter(Boolean).filter(v => !v.startsWith("resolution="));
    parts.push("resolution=merge-duplicates");
    incoming.set("Prefer", parts.join(", "));

    if (input instanceof Request) {
      const req = input.clone();
      return nativeFetch(new Request(url.toString(), {
        method: req.method,
        headers: incoming,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
        credentials: req.credentials,
        mode: req.mode,
        cache: req.cache,
        redirect: req.redirect,
        referrer: req.referrer,
        referrerPolicy: req.referrerPolicy,
        integrity: req.integrity,
      }));
    }

    return nativeFetch(url.toString(), { ...init, headers: incoming });
  };
})();
