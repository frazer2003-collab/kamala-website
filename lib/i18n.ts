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
    beds: "Bed setup",
    bedsHelp: "Superior can be set as a king or twin. Choose one before you pay.",
    bedsChoose: "Choose bed setup",
    bedsRequired: "Choose a king bed or twin beds.",
    bedsFixedHelp: "This room has a fixed bed layout — no choice needed.",
    bedDouble: "King — one bed",
    bedTwin: "Twin — two single beds",
    bedReceiptLabel: "Beds",
    guestNote: "Note for staff",
    required: "Required",
    nights: "Nights",
    nightsAria: "Calculated nights",
    phonePlaceholder: "Include country code, e.g. +66",
    notePlaceholder: "Arrival time, breakfast needs, or questions about the room.",
    roomFull: "This room is full for your dates. Choose another room or change dates.",
    allRoomsFull:
      "All rooms are currently full. Please check back later or contact staff directly.",
    quoteHint:
      "Choose arrival and departure to see your total, including any promotional rates.",
    roomFullSuffix: " · Full",
    paymentsNotConfigured:
      "Online payment is temporarily unavailable. Please contact the guesthouse to complete your booking.",
    payDeposit: "Pay in full",
    continueToPayment: "Continue to payment",
    stripeSecureCheckout:
      "Card details are secured by Stripe. A fixed 6% bank charge is included in the total shown below.",
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
    promoCodeLabel: "Promo code",
    promoCodeApply: "Apply",
    promoCodeRemove: "Remove",
    promoCodeApplied: "Code applied to your stay.",
    promoCodeCleared: "Code cleared — apply again for this stay.",
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
    card_already_paid:
      "Your card payment already succeeded. Continue with the card confirmation instead.",
    card_processing:
      "Your card payment is still processing. Wait for card confirmation before choosing bank transfer.",
    cardPaymentStartFailed:
      "We could not start card payment. Please try again in a moment.",
    tryCardAgain: "Try card again",
    confirmingQuote: "Confirming stay total…",
    quoteUnavailable:
      "Could not confirm the live total. Showing the calculated price — check again before paying.",
    offlineBanner:
      "You’re offline. Reconnect to continue booking and payment.",
    bankChargeLabel: "Bank charge (6%)",
    promptPayQrAlt: "PromptPay QR code for your stay",
    bankTransferWaitingTitle: "We are checking your transfer.",
    bankTransferWaitingBody:
      "Your room is held while staff verify payment. We will confirm your booking and message you after the transfer is checked.",
    staySummaryDates: "Stay",
    confirmedTitle: "Your stay is confirmed.",
    confirmedPendingTitle: "Payment received — finishing your reservation",
    confirmedOverbookedTitle: "Payment received — we'll confirm shortly",
    confirmedBody:
      "We received your full payment for {room}. Your stay is confirmed — message us any time about arrival details.",
    confirmedPendingBody:
      "Your payment went through. Refresh this page in a moment, or check your email — we will add your conversation link as soon as the reservation is ready.",
    confirmedOverbookedBody:
      "We received your full payment for {room}. Our staff will check your dates and message you shortly with confirmation and arrival details. Your payment is safe.",
    confirmedChatHint:
      "Message Kamala below about your stay. We email you when there is a reply — open the conversation from that email anytime.",
    requestedTitle: "We received your booking request.",
    requestedBody:
      "{property} will review your dates and reply with confirmation details. No card payment was taken online.",
    requestedChatHint:
      "You can message Kamala on the next page. We email you when there is a reply — open the conversation from that email anytime.",
    openBookingConversation: "Open conversation",
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
    beds: "รูปแบบเตียง",
    bedsHelp: "ห้อง Superior เลือกได้ระหว่างเตียงคิงหรือทวิน กรุณาเลือกก่อนชำระเงิน",
    bedsChoose: "เลือกรูปแบบเตียง",
    bedsRequired: "กรุณาเลือกเตียงคิงหรือทวิน",
    bedsFixedHelp: "ห้องนี้มีรูปแบบเตียงคงที่ — ไม่ต้องเลือก",
    bedDouble: "คิง — เตียงใหญ่หนึ่งหลัง",
    bedTwin: "ทวิน — เตียงเดี่ยวสองหลัง",
    bedReceiptLabel: "เตียง",
    guestNote: "ข้อความถึงเจ้าหน้าที่",
    required: "จำเป็น",
    nights: "จำนวนคืน",
    nightsAria: "จำนวนคืนที่คำนวณแล้ว",
    phonePlaceholder: "ใส่รหัสประเทศ เช่น +66",
    notePlaceholder: "เวลาเข้าพัก ความต้องการอาหารเช้า หรือคำถามเกี่ยวกับห้อง",
    roomFull: "ห้องนี้เต็มสำหรับวันที่เลือก กรุณาเลือกห้องอื่นหรือเปลี่ยนวันที่",
    allRoomsFull:
      "ห้องทั้งหมดเต็มในขณะนี้ กรุณาลองใหม่ภายหลังหรือติดต่อเจ้าหน้าที่โดยตรง",
    quoteHint: "เลือกวันเช็คอินและเช็คเอาท์เพื่อดูยอดรวม รวมถึงโปรโมชัน (ถ้ามี)",
    roomFullSuffix: " · เต็ม",
    paymentsNotConfigured:
      "ระบบชำระเงินออนไลน์ยังไม่พร้อมชั่วคราว กรุณาติดต่อที่พักเพื่อจองให้เสร็จสมบูรณ์",
    payDeposit: "ชำระเต็มจำนวน",
    continueToPayment: "ดำเนินการชำระเงิน",
    stripeSecureCheckout:
      "ข้อมูลบัตรได้รับการดูแลอย่างปลอดภัยโดย Stripe ยอดรวมด้านล่างรวมค่าธรรมเนียมธนาคาร 6% แล้ว",
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
    promoCodeLabel: "รหัสโปรโมชัน",
    promoCodeApply: "ใช้รหัส",
    promoCodeRemove: "ลบรหัส",
    promoCodeApplied: "ใช้รหัสกับการเข้าพักแล้ว",
    promoCodeCleared: "ลบรหัสแล้ว — ใช้รหัสอีกครั้งสำหรับการเข้าพักนี้",
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
    card_already_paid:
      "การชำระด้วยบัตรสำเร็จแล้ว กรุณาดำเนินการต่อด้วยการยืนยันการชำระด้วยบัตร",
    card_processing:
      "การชำระด้วยบัตรกำลังดำเนินการ กรุณารอการยืนยันก่อนเลือกโอนเงินผ่านธนาคาร",
    cardPaymentStartFailed:
      "ไม่สามารถเริ่มการชำระด้วยบัตรได้ กรุณาลองอีกครั้งในอีกสักครู่",
    tryCardAgain: "ลองชำระด้วยบัตรอีกครั้ง",
    confirmingQuote: "กำลังยืนยันยอดที่พัก…",
    quoteUnavailable:
      "ไม่สามารถยืนยันยอดล่าสุดได้ กำลังแสดงราคาคำนวณ — ตรวจสอบอีกครั้งก่อนชำระเงิน",
    offlineBanner: "คุณออฟไลน์อยู่ กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อจองและชำระเงินต่อ",
    bankChargeLabel: "ค่าธรรมเนียมธนาคาร (6%)",
    promptPayQrAlt: "คิวอาร์โค้ดพร้อมเพย์สำหรับค่าที่พัก",
    bankTransferWaitingTitle: "เรากำลังตรวจสอบการโอนเงินของคุณ",
    bankTransferWaitingBody:
      "เราจะกันห้องไว้ระหว่างที่เจ้าหน้าที่ตรวจสอบการชำระเงิน และจะยืนยันการจองพร้อมส่งข้อความหลังตรวจสอบเรียบร้อย",
    staySummaryDates: "วันที่พัก",
    confirmedTitle: "การจองของคุณยืนยันแล้ว",
    confirmedPendingTitle: "ได้รับชำระเงินแล้ว — กำลังจัดทำการจอง",
    confirmedOverbookedTitle: "ได้รับชำระเงินแล้ว — เราจะยืนยันในไม่ช้า",
    confirmedBody:
      "เราได้รับชำระเต็มจำนวนสำหรับ {room} แล้ว การจองของคุณยืนยันแล้ว — ส่งข้อความหาเราได้ทุกเมื่อเกี่ยวกับรายละเอียดการเข้าพัก",
    confirmedPendingBody:
      "การชำระเงินของคุณสำเร็จแล้ว รีเฟรชหน้านี้ในอีกสักครู่ หรือตรวจสอบอีเมล — เราจะเพิ่มลิงก์สนทนาเมื่อการจองพร้อม",
    confirmedOverbookedBody:
      "เราได้รับชำระเต็มจำนวนสำหรับ {room} แล้ว เจ้าหน้าที่จะตรวจสอบวันที่พักและส่งข้อความยืนยันพร้อมรายละเอียดการเข้าพักในไม่ช้า การชำระเงินของคุณปลอดภัย",
    confirmedChatHint:
      "ส่งข้อความถึง Kamala ด้านล่างเกี่ยวกับการเข้าพักของคุณ เราจะส่งอีเมลเมื่อมีการตอบกลับ — เปิดสนทนาจากอีเมลนั้นได้ทุกเมื่อ",
    requestedTitle: "เราได้รับคำขอจองของคุณแล้ว",
    requestedBody:
      "{property} จะตรวจสอบวันที่พักและตอบกลับพร้อมรายละเอียดการยืนยัน ไม่มีการชำระด้วยบัตรออนไลน์",
    requestedChatHint:
      "คุณสามารถส่งข้อความถึง Kamala ได้ในหน้าถัดไป เราจะส่งอีเมลเมื่อมีการตอบกลับ — เปิดสนทนาจากอีเมลนั้นได้ทุกเมื่อ",
    openBookingConversation: "เปิดสนทนาของคุณ",
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
