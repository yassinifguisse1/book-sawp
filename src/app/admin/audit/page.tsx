import { AdminPlanned } from "@/components/admin/AdminPlanned";

export default function Page() {
  return (
    <AdminPlanned
      title="Audit logs"
      description="Immutable record of every sensitive admin action."
      items={[
        "admin_user_id, action_type, target_type, target_id",
        "reason, metadata, and created_at",
        "Filter by actor, action type, and target",
      ]}
    />
  );
}
