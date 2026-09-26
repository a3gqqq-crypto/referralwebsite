import Icon from "./Icon";
import { STAFF_LABEL, useStaff } from "../data/staff";

// Official Owner/Admin tag. Comes from the admins table, so it can't be faked.
function StaffTag({ userId, size = "sm" }) {
  const role = useStaff().get(userId);

  if (!role) return null;

  return (
    <span
      className={`staff-tag staff-${role} staff-tag-${size}`}
      title={role === "owner" ? "Suffrova owner" : "Suffrova admin"}
    >
      <Icon name={role === "owner" ? "crown" : "shield"} size={size === "lg" ? 14 : 11} strokeWidth={2.4} />
      {STAFF_LABEL[role]}
    </span>
  );
}

export default StaffTag;
