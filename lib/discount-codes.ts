export type DiscountCode = {
  id: string;
  code: string;
  percentOff: number;
  roomId: string | null;
  validUntil: string | null;
  maxUses: number | null;
  usesCount: number;
  label: string | null;
  active: boolean;
  createdAt: string;
};

export type DiscountCodeValidationReason =
  | "not_found"
  | "inactive"
  | "expired"
  | "exhausted"
  | "wrong_room";

export type DiscountCodeValidationResult =
  | { ok: true; code: DiscountCode }
  | { ok: false; reason: DiscountCodeValidationReason };

export function normalizeDiscountCodeInput(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function isDiscountCodeFormatValid(normalized: string) {
  return /^[A-Z0-9]{3,20}$/.test(normalized);
}

export function validateDiscountCodeForBooking(
  code: DiscountCode,
  roomId: string,
  todayIso: string,
): DiscountCodeValidationResult {
  if (!code.active) {
    return { ok: false, reason: "inactive" };
  }

  if (code.validUntil && code.validUntil < todayIso) {
    return { ok: false, reason: "expired" };
  }

  if (code.maxUses !== null && code.usesCount >= code.maxUses) {
    return { ok: false, reason: "exhausted" };
  }

  if (code.roomId && code.roomId !== roomId) {
    return { ok: false, reason: "wrong_room" };
  }

  return { ok: true, code };
}

export function discountCodeValidationMessage(reason: DiscountCodeValidationReason) {
  switch (reason) {
    case "not_found":
      return "Code not recognized.";
    case "inactive":
      return "This code is no longer available.";
    case "expired":
      return "This code has expired.";
    case "exhausted":
      return "This code has reached its use limit.";
    case "wrong_room":
      return "This code doesn't apply to this room.";
    default:
      return "This code can't be used for this stay.";
  }
}

function mapDiscountCodeRow(row: {
  id: string;
  code: string;
  percent_off: number;
  room_id: string | null;
  valid_until: string | null;
  max_uses: number | null;
  uses_count: number;
  label: string | null;
  active: boolean;
  created_at: string;
}): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    roomId: row.room_id,
    validUntil: row.valid_until,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    label: row.label,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function getStaffDiscountCodes(): Promise<DiscountCode[]> {
  const { createStaffSupabaseClient, hasStaffSupabaseConfig } = await import("@/lib/supabase");
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapDiscountCodeRow);
}

export async function getDiscountCodeByNormalizedCode(
  normalizedCode: string,
): Promise<DiscountCode | null> {
  const { createStaffSupabaseClient, hasStaffSupabaseConfig } = await import("@/lib/supabase");
  if (!hasStaffSupabaseConfig() || !normalizedCode) {
    return null;
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .ilike("code", normalizedCode)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapDiscountCodeRow(data);
}

export async function releaseDiscountCodeUse(codeId: string) {
  const { createStaffSupabaseClient, hasStaffSupabaseConfig } = await import("@/lib/supabase");
  if (!hasStaffSupabaseConfig() || !codeId) {
    return;
  }

  const supabase = createStaffSupabaseClient();
  const { data: row } = await supabase
    .from("discount_codes")
    .select("uses_count")
    .eq("id", codeId)
    .maybeSingle();

  if (!row || row.uses_count <= 0) {
    return;
  }

  await supabase
    .from("discount_codes")
    .update({ uses_count: row.uses_count - 1 })
    .eq("id", codeId);
}
