import { redirect } from "next/navigation";
import { getSessionUser } from "@/auth";

export default async function Home() {
  // Builders live in their work items (the Copado mental model); release
  // managers live on the pipeline board.
  const user = await getSessionUser();
  redirect(user && user.role === "citizen" ? "/my-changes" : "/pipeline");
}
