export type Locale = "en" | "th";

export const locales: Locale[] = ["en", "th"];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "th";
}

const messages = {
  en: {
    requestStay: "Request a stay",
    requestStayTitle: "Request your stay",
    completeReservation: "Complete your reservation",
    bookingIntro:
      "Pay the full stay to reserve your room. Staff confirm every booking and email arrival details.",
    bookingIntroPayment:
      "Review your stay, then pay below. This covers the full stay — nothing more is due later. Staff confirm every booking and email arrival details.",
    guestName: "Your name",
    guestEmail: "Email",
    guestPhone: "Phone",
    arrival: "Arrival",
    departure: "Departure",
    room: "Room",
    guestNote: "Note for staff",
    required: "Required",
    nights: "Nights",
    nightsAria: "Calculated nights",
    phonePlaceholder: "Include country code, e.g. +66",
    notePlaceholder: "Arrival time, breakfast needs, or questions about the room.",
    roomFull: "This room is full. Choose another room to send a request.",
    allRoomsFull:
      "All rooms are currently full. Please check back later or contact staff directly.",
    quoteHint:
      "Choose arrival and departure to see your total, including any promotional rates.",
    roomFullSuffix: " · FULL",
    paymentsNotConfigured:
      "Online payment is temporarily unavailable. Please contact the guesthouse to complete your booking.",
    payDeposit: "Pay in full",
    continueToPayment: "Continue to payment",
    stripeSecureCheckout:
      "Card details are secured by Stripe. A fixed 3% bank charge is included in the total shown below.",
    paymentSecureBadge: "Processed securely by Stripe",
    paymentTrustPolicies: "Read our Privacy Policy and Terms before you pay.",
    paymentPrivacyLink: "Privacy Policy",
    paymentTermsLink: "Terms",
    paymentDetails: "Secure payment",
    editBookingDetails: "Edit booking details",
    processingPayment: "Processing payment...",
    paymentFailed:
      "Payment could not be completed. Check the details and try again.",
    startingCheckout: "Preparing secure payment...",
    sendingRequest: "Sending request...",
    estimatedTotal: "Stay total",
    depositDue: "Total due today",
    progressStay: "Your stay",
    progressDetails: "Guest details",
    progressPay: "Pay in full",
    nightsLine: "nights at",
    promoSavings: "Promotional savings",
    language: "Language",
    paymentMethodLabel: "Payment method",
    payWithBankTransfer: "Bank transfer",
    payWithCard: "Card",
    payWithCardInstead: "Pay with card instead",
    bankTransferIntro:
      "Transfer the exact amount to the guesthouse account below, then tell us when it is complete.",
    bankTransferIvePaid: "I’ve paid",
    bankTransferWaiting: "Recording your transfer...",
    bankTransferSecureBadge: "Guesthouse payment details",
    bankTransferTrust:
      "This transfer goes to the guesthouse account shown here. Staff will verify it before confirming your booking.",
    bankTransferExactAmount: "Transfer this exact amount",
    bankTransferAccountTitle: "Bank account",
    bankNameLabel: "Bank",
    accountNameLabel: "Account name",
    accountNumberLabel: "Account number",
    bankTransferQrLoading: "Preparing PromptPay QR...",
    bankTransferQrUnavailable:
      "The PromptPay QR could not be prepared. Use the bank account details below or choose card.",
    bankTransferQrUnavailableNoAccount:
      "The PromptPay QR could not be prepared. Choose card or contact staff for help.",
    bankTransferClaimFailed:
      "We could not record your bank transfer. Please try again or contact staff.",
    cardPaymentStartFailed:
      "We could not start card payment. Please try again in a moment.",
    bankChargeLabel: "Bank charge (3%)",
    promptPayQrAlt: "PromptPay QR code for your stay",
    bankTransferWaitingTitle: "We’re checking your transfer.",
    bankTransferWaitingBody:
      "Your room is being held while staff verify the payment. We’ll confirm your booking and send arrival details after the transfer is checked.",
    staySummaryDates: "Stay",
    confirmedTitle: "Your room is reserved.",
    confirmedPendingTitle: "Payment confirmed — finishing your reservation",
    confirmedBody:
      "We received your full payment for {room} and reserved those dates. Staff will review the request and message you with arrival details.",
    confirmedPendingBody:
      "Your payment went through. We’re setting up your reservation now. Refresh this page in a moment, or check your email — we’ll confirm as soon as it’s ready.",
    confirmedChatHint:
      "Save your private conversation link — it is the only way to message us about this booking. We also email you when there is a new message.",
    openBookingConversation: "Open booking conversation",
    backToHome: "Back to home",
    cancelledTitle: "No payment was taken.",
    cancelledBody:
      "Your room was not reserved. You can return to the booking form and try again when you are ready.",
    returnToBooking: "Return to booking form",
  },
  th: {
    requestStay: "ขอจองที่พัก",
    requestStayTitle: "ขอจองที่พักของคุณ",
    completeReservation: "ชำระเงินเพื่อยืนยันการจอง",
    bookingIntro:
      "ชำระค่าที่พักเต็มจำนวนเพื่อจองห้อง เจ้าหน้าที่จะยืนยันทุกการจองและส่งรายละเอียดการเข้าพักทางอีเมล",
    bookingIntroPayment:
      "ตรวจสอบรายละเอียดที่พักแล้วชำระด้านล่าง ยอดนี้ครอบคลุมค่าที่พักทั้งหมด — ไม่มียอดค้างชำระภายหลัง เจ้าหน้าที่จะยืนยันทุกการจองและส่งรายละเอียดการเข้าพักทางอีเมล",
    guestName: "ชื่อของคุณ",
    guestEmail: "อีเมล",
    guestPhone: "โทรศัพท์",
    arrival: "เช็คอิน",
    departure: "เช็คเอาท์",
    room: "ห้องพัก",
    guestNote: "ข้อความถึงเจ้าหน้าที่",
    required: "จำเป็น",
    nights: "จำนวนคืน",
    nightsAria: "จำนวนคืนที่คำนวณแล้ว",
    phonePlaceholder: "ใส่รหัสประเทศ เช่น +66",
    notePlaceholder: "เวลาเข้าพัก ความต้องการอาหารเช้า หรือคำถามเกี่ยวกับห้อง",
    roomFull: "ห้องนี้เต็มแล้ว กรุณาเลือกห้องอื่นเพื่อส่งคำขอ",
    allRoomsFull:
      "ห้องทั้งหมดเต็มในขณะนี้ กรุณาลองใหม่ภายหลังหรือติดต่อเจ้าหน้าที่โดยตรง",
    quoteHint: "เลือกวันเช็คอินและเช็คเอาท์เพื่อดูยอดรวม รวมถึงโปรโมชัน (ถ้ามี)",
    roomFullSuffix: " · เต็ม",
    paymentsNotConfigured:
      "ระบบชำระเงินออนไลน์ยังไม่พร้อมชั่วคราว กรุณาติดต่อที่พักเพื่อจองให้เสร็จสมบูรณ์",
    payDeposit: "ชำระเต็มจำนวน",
    continueToPayment: "ดำเนินการชำระเงิน",
    stripeSecureCheckout:
      "ข้อมูลบัตรได้รับการดูแลอย่างปลอดภัยโดย Stripe ยอดรวมด้านล่างรวมค่าธรรมเนียมธนาคาร 3% แล้ว",
    paymentSecureBadge: "ชำระเงินอย่างปลอดภัยผ่าน Stripe",
    paymentTrustPolicies:
      "อ่านนโยบายความเป็นส่วนตัวและข้อกำหนดก่อนชำระเงิน",
    paymentPrivacyLink: "นโยบายความเป็นส่วนตัว",
    paymentTermsLink: "ข้อกำหนด",
    paymentDetails: "ชำระเงินอย่างปลอดภัย",
    editBookingDetails: "แก้ไขรายละเอียดการจอง",
    processingPayment: "กำลังดำเนินการชำระเงิน...",
    paymentFailed:
      "ชำระเงินไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง",
    startingCheckout: "กำลังเตรียมการชำระเงิน...",
    sendingRequest: "กำลังส่งคำขอ...",
    estimatedTotal: "ยอดที่พักทั้งหมด",
    depositDue: "ยอดที่ต้องชำระวันนี้",
    progressStay: "ที่พักของคุณ",
    progressDetails: "รายละเอียดผู้เข้าพัก",
    progressPay: "ชำระเต็มจำนวน",
    nightsLine: "คืนที่",
    promoSavings: "ส่วนลดโปรโมชัน",
    language: "ภาษา",
    paymentMethodLabel: "วิธีชำระเงิน",
    payWithBankTransfer: "โอนเงินผ่านธนาคาร",
    payWithCard: "บัตร",
    payWithCardInstead: "ชำระด้วยบัตรแทน",
    bankTransferIntro:
      "โอนยอดที่ระบุไปยังบัญชีของที่พักด้านล่าง แล้วแจ้งเราเมื่อโอนเรียบร้อย",
    bankTransferIvePaid: "โอนเงินแล้ว",
    bankTransferWaiting: "กำลังบันทึกการโอนเงิน...",
    bankTransferSecureBadge: "ข้อมูลการชำระเงินของที่พัก",
    bankTransferTrust:
      "เงินจะถูกโอนไปยังบัญชีของที่พักที่แสดง เจ้าหน้าที่จะตรวจสอบก่อนยืนยันการจอง",
    bankTransferExactAmount: "กรุณาโอนยอดนี้ให้ตรง",
    bankTransferAccountTitle: "บัญชีธนาคาร",
    bankNameLabel: "ธนาคาร",
    accountNameLabel: "ชื่อบัญชี",
    accountNumberLabel: "เลขที่บัญชี",
    bankTransferQrLoading: "กำลังสร้างพร้อมเพย์ QR...",
    bankTransferQrUnavailable:
      "ไม่สามารถสร้างพร้อมเพย์ QR ได้ กรุณาใช้ข้อมูลบัญชีธนาคารด้านล่างหรือเลือกชำระด้วยบัตร",
    bankTransferQrUnavailableNoAccount:
      "ไม่สามารถสร้างพร้อมเพย์ QR ได้ กรุณาเลือกชำระด้วยบัตรหรือติดต่อเจ้าหน้าที่",
    bankTransferClaimFailed:
      "ไม่สามารถบันทึกการโอนเงินของคุณได้ กรุณาลองอีกครั้งหรือติดต่อเจ้าหน้าที่",
    cardPaymentStartFailed:
      "ไม่สามารถเริ่มการชำระด้วยบัตรได้ กรุณาลองอีกครั้งในอีกสักครู่",
    bankChargeLabel: "ค่าธรรมเนียมธนาคาร (3%)",
    promptPayQrAlt: "คิวอาร์โค้ดพร้อมเพย์สำหรับค่าที่พัก",
    bankTransferWaitingTitle: "เรากำลังตรวจสอบการโอนเงินของคุณ",
    bankTransferWaitingBody:
      "เราจะกันห้องไว้ระหว่างที่เจ้าหน้าที่ตรวจสอบการชำระเงิน และจะยืนยันการจองพร้อมส่งรายละเอียดการเข้าพักหลังตรวจสอบเรียบร้อย",
    staySummaryDates: "วันที่พัก",
    confirmedTitle: "ห้องของคุณถูกจองแล้ว",
    confirmedPendingTitle: "ชำระเงินสำเร็จ — กำลังจัดทำการจอง",
    confirmedBody:
      "เราได้รับชำระเต็มจำนวนสำหรับ {room} และจองวันที่ของคุณไว้แล้ว เจ้าหน้าที่จะตรวจสอบคำขอและส่งข้อความพร้อมรายละเอียดการเข้าพัก",
    confirmedPendingBody:
      "การชำระเงินของคุณสำเร็จแล้ว เรากำลังจัดทำการจอง รีเฟรชหน้านี้ในอีกสักครู่ หรือตรวจสอบอีเมล — เราจะยืนยันเมื่อพร้อม",
    confirmedChatHint:
      "บันทึกลิงก์สนทนาส่วนตัวไว้ — นี่คือช่องทางเดียวสำหรับติดต่อเรื่องการจองนี้ เราจะส่งอีเมลเมื่อมีข้อความใหม่",
    openBookingConversation: "เปิดสนทนาการจอง",
    backToHome: "กลับหน้าแรก",
    cancelledTitle: "ไม่มีการชำระเงิน",
    cancelledBody:
      "ห้องยังไม่ได้ถูกจอง คุณสามารถกลับไปที่แบบฟอร์มจองและลองใหม่เมื่อพร้อม",
    returnToBooking: "กลับไปที่แบบฟอร์มจอง",
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export function t(locale: Locale, key: MessageKey) {
  return messages[locale][key];
}

export function tReplace(
  locale: Locale,
  key: MessageKey,
  replacements: Record<string, string>,
) {
  let value = messages[locale][key] as string;
  for (const [token, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${token}}`, replacement);
  }
  return value;
}
