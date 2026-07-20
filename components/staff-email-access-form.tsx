"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { updateStaffNotificationCalendarAccess } from "@/app/staff/auth-actions";
import type { StaffCalendarAccess } from "@/lib/staff-notification-emails";

type StaffEmailAccessFormProps = {
  emailId: string;
  calendarAccess: StaffCalendarAccess;
  disabled?: boolean;
};

export function StaffEmailAccessForm({
  emailId,
  calendarAccess,
  disabled = false,
}: StaffEmailAccessFormProps) {
  return (
    <form action={updateStaffNotificationCalendarAccess} className="staff-email-access">
      <StaffFormBusyBridge />
      <input name="email-id" type="hidden" value={emailId} />
      <label className="sr-only" htmlFor={`calendar-access-${emailId}`}>
        Calendar access
      </label>
      <select
        defaultValue={calendarAccess}
        disabled={disabled}
        id={`calendar-access-${emailId}`}
        name="calendar-access"
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="read_write">Read &amp; write</option>
        <option value="read">Read only</option>
      </select>
    </form>
  );
}
