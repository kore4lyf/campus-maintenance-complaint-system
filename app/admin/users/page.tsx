import { Metadata } from "next";
import { UsersManager } from "@/components/admin/UsersManager";

export const metadata: Metadata = {
  title: "User Management — DICT Console",
};

export default function AdminUsersPage() {
  return <UsersManager />;
}
