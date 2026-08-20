(() => {
  const SUPABASE_URL = "https://fnuncwcsliojhgkmmhwo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe";
  let bootError = null;

  window.addEventListener("error", (event) => {
    if (!bootError) bootError = event?.error?.message || event?.message || "Application failed to start.";
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (!bootError) bootError = event?.reason?.message || String(event?.reason || "Application failed to start.");
  });

  function showFallback(message) {
    const root = document.getElementById("root");
    if (!root || root.children.length) return;
    root.innerHTML = `
      <div class="auth" style="font-family:Arial,sans-serif;background:#f5f7fb;color:#172033">
        <form id="boot-login" class="login-card" style="background:#fff;box-shadow:0 12px 40px rgba(20,40,80,.12)">
          <div class="login-logo">🛒</div>
          <h1>SmallBiz POS</h1>
          <p>Sign in to your business account</p>
          <input id="boot-email" type="email" placeholder="Email" autocomplete="username" required />
          <input id="boot-password" type="password" placeholder="Password" autocomplete="current-password" required />
          <button class="primary" type="submit">Login</button>
          <p id="boot-status" class="error" style="display:none"></p>
        </form>
      </div>`;

    const form = document.getElementById("boot-login");
    const status = document.getElementById("boot-status");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.style.display = "block";
      status.style.color = "#315bd6";
      status.textContent = "Signing in...";
      try {
        if (!window.supabase?.createClient) throw new Error("Authentication service is still loading. Please try again.");
        const client = window.__SMALLBIZ_BOOT_SUPABASE__ || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        window.__SMALLBIZ_BOOT_SUPABASE__ = client;
        const { data, error } = await client.auth.signInWithPassword({
          email: document.getElementById("boot-email").value.trim(),
          password: document.getElementById("boot-password").value
        });
        if (error) throw error;
        if (!data?.session) throw new Error("Login succeeded but no session was returned.");
        status.textContent = "Login successful. Opening POS...";
        location.reload();
      } catch (error) {
        status.style.color = "#d92d20";
        status.textContent = error?.message || "Unable to sign in.";
      }
    });

    if (message) {
      status.style.display = "block";
      status.style.color = "#b54708";
      status.textContent = "POS startup recovery is active. Please sign in again.";
    }
  }

  // Only take over when React failed to mount. Normal POS rendering is untouched.
  setTimeout(() => {
    const root = document.getElementById("root");
    if (root && !root.children.length) showFallback(bootError);
  }, 1800);
})();
