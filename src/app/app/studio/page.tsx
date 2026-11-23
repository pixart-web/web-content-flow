import { redirect } from "next/navigation";

// The Studio home preview (doc 55, S0) became the app home in S3.
export default function StudioPreviewRedirect() {
  redirect("/app");
}
