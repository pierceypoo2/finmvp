import { redirect } from "next/navigation";

/** @deprecated Use `/calibration` — kept for bookmarks and old links. */
export default function CategorizeRedirectPage() {
  redirect("/calibration");
}
