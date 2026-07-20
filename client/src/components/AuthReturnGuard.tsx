import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

const ALLOWED_RETURN_PATHS = [
  "/designer-register",
  "/designer/studio",
];

export default function AuthReturnGuard() {
  const { data: user } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!user) return;
    const path = window.location.pathname;
    if (path !== "/login" && path !== "/register") return;
    const requested = new URLSearchParams(window.location.search).get("return");
    if (!requested || !ALLOWED_RETURN_PATHS.includes(requested)) return;
    window.location.replace(requested);
  }, [user]);

  return null;
}
