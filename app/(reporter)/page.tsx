import { redirect } from "next/navigation";

export default function ReporterHomePage(): never {
  // The reporter's actual dashboard lives at /complaints/mine; the role-group
  // root just gets forwarded on every render.
  redirect("/complaints/mine");
}
