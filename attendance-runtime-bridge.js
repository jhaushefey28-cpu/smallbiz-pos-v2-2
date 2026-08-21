// SMALLBIZ_ATTENDANCE_RUNTIME_BRIDGE_V2
// Provides the existing attendance module with the browser Supabase client contract it expects.
// This bridge is isolated from the core App/auth implementation.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://fnuncwcsliojhgkmmhwo.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe";

if (url && key) {
  const client = window.__smallbizAttendanceSupabase || createClient(url, key);
  window.__smallbizAttendanceSupabase = client;

  if (!window.supabase?.createClient) {
    window.supabase = {
      createClient: () => window.__smallbizAttendanceSupabase
    };
  }
}

console.info("[SmallBiz] Attendance runtime bridge V2 ready.");
