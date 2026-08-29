import { redirect } from "next/navigation";

// Renamed to /leads — kept as a redirect so any existing bookmarks/links to /lms still work.
export default function LmsRedirect() {
  redirect("/my-leads");
}
