import { useEffect } from "react";
import FundingCommandCentre from "./FundingCommandCentre";

export default function FundingProMatch() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get("tab")) {
      url.searchParams.set("tab", "matches");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, []);
  return <FundingCommandCentre />;
}
