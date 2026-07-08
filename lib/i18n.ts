export type Locale = "en" | "th";

export const locales: Locale[] = ["en", "th"];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "th";
}

const messages = {
  en: {
    requestStay: "Request a stay",
    guestName: "Your name",
    guestEmail: "Email",
    guestPhone: "Phone",
    arrival: "Arrival",
    departure: "Departure",
    room: "Room",
    guestNote: "Note for staff",
    payDeposit: "Pay deposit",
    continueToPayment: "Continue to payment",
    stripeSecureCheckout:
      "Enter your card details below. Payment is processed securely by Stripe.",
    paymentDetails: "Card payment",
    editBookingDetails: "Edit booking details",
    processingPayment: "Processing payment...",
    paymentFailed: "Payment could not be completed. Check your card details and try again.",
    startingCheckout: "Preparing secure payment...",
    sendingRequest: "Sending request...",
    estimatedTotal: "Estimated total",
    depositDue: "Deposit due now",
    language: "Language",
  },
  th: {
    requestStay: "ขอจองที่พัก",
    guestName: "ชื่อของคุณ",
    guestEmail: "อีเมล",
    guestPhone: "โทรศัพท์",
    arrival: "เช็คอิน",
    departure: "เช็คเอาท์",
    room: "ห้องพัก",
    guestNote: "ข้อความถึงเจ้าหน้าที่",
    payDeposit: "ชำระมัดจำ",
    continueToPayment: "ดำเนินการชำระเงิน",
    stripeSecureCheckout:
      "กรอกรายละเอียดบัตรด้านล่าง การชำระเงินดำเนินการอย่างปลอดภัยผ่าน Stripe",
    paymentDetails: "ชำระเงินด้วยบัตร",
    editBookingDetails: "แก้ไขรายละเอียดการจอง",
    processingPayment: "กำลังดำเนินการชำระเงิน...",
    paymentFailed: "ชำระเงินไม่สำเร็จ กรุณาตรวจสอบรายละเอียดบัตรแล้วลองอีกครั้ง",
    startingCheckout: "กำลังเตรียมการชำระเงิน...",
    sendingRequest: "กำลังส่งคำขอ...",
    estimatedTotal: "ยอดรวมโดยประมาณ",
    depositDue: "มัดจำที่ต้องชำระตอนนี้",
    language: "ภาษา",
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export function t(locale: Locale, key: MessageKey) {
  return messages[locale][key];
}
