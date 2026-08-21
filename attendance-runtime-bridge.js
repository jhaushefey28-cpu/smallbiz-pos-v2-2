// SMALLBIZ_ATTENDANCE_RUNTIME_BRIDGE_V1
// Provides the existing attendance module with the same browser Supabase client contract
// without touching the core App/auth implementation.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://fnuncwcsliojhgkmmhwo.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe";

if (url && key && !window.supabase?.createClient) {
  window.supabase = createClient(url, key);
}

console.info("[SmallBiz] Attendance runtime bridge ready.");
