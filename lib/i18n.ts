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
      "Pay by card or Thai QR (PromptPay). Payment is processed securely by Stripe.",
    paymentDetails: "Pay deposit",
    editBookingDetails: "Edit booking details",
    processingPayment: "Processing payment...",
    paymentFailed:
      "Payment could not be completed. Try another card or PromptPay QR, then try again.",
    startingCheckout: "Preparing secure payment...",
    sendingRequest: "Sending request...",
    estimatedTotal: "Estimated total",
    depositDue: "Deposit due now",
    progressStay: "Your stay",
    progressDetails: "Guest details",
    progressPay: "Pay deposit",
    nightsLine: "nights at",
    promoSavings: "Promotional savings",
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
      "ชำระด้วยบัตรหรือพร้อมเพย์ (QR) การชำระเงินดำเนินการอย่างปลอดภัยผ่าน Stripe",
    paymentDetails: "ชำระมัดจำ",
    editBookingDetails: "แก้ไขรายละเอียดการจอง",
    processingPayment: "กำลังดำเนินการชำระเงิน...",
    paymentFailed:
      "ชำระเงินไม่สำเร็จ ลองใช้บัตรอื่นหรือพร้อมเพย์ QR แล้วลองอีกครั้ง",
    startingCheckout: "กำลังเตรียมการชำระเงิน...",
    sendingRequest: "กำลังส่งคำขอ...",
    estimatedTotal: "ยอดรวมโดยประมาณ",
    depositDue: "มัดจำที่ต้องชำระตอนนี้",
    progressStay: "ที่พักของคุณ",
    progressDetails: "รายละเอียดผู้เข้าพัก",
    progressPay: "ชำระมัดจำ",
    nightsLine: "คืนที่",
    promoSavings: "ส่วนลดโปรโมชัน",
    language: "ภาษา",
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export function t(locale: Locale, key: MessageKey) {
  return messages[locale][key];
}
