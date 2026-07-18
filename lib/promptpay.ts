const PAYLOAD_FORMAT = "00";
const POI_METHOD = "01";
const MERCHANT_ACCOUNT = "29";
const TRANSACTION_CURRENCY = "53";
const TRANSACTION_AMOUNT = "54";
const COUNTRY_CODE = "58";
const CRC = "63";

const EMV_PAYLOAD_FORMAT = "01";
const POI_DYNAMIC = "12";
const PROMPTPAY_AID = "A000000677010111";
const CURRENCY_THB = "764";
const COUNTRY_TH = "TH";

function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatPromptPayTarget(digits: string): string {
  if (digits.length === 13 || digits.length >= 15) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `0066${digits.slice(1)}`;
  }
  return digits;
}

export function normalizePromptPayId(id: string): string {
  return id.replace(/\D/g, "");
}

export function buildPromptPayPayload(promptPayId: string, amountBaht: number): string {
  const digits = normalizePromptPayId(promptPayId);
  const target = formatPromptPayTarget(digits);

  const merchantInfo =
    tlv("00", PROMPTPAY_AID) + tlv("01", target);

  const payload =
    tlv(PAYLOAD_FORMAT, EMV_PAYLOAD_FORMAT) +
    tlv(POI_METHOD, POI_DYNAMIC) +
    tlv(MERCHANT_ACCOUNT, merchantInfo) +
    tlv(TRANSACTION_CURRENCY, CURRENCY_THB) +
    tlv(TRANSACTION_AMOUNT, amountBaht.toFixed(2)) +
    tlv(COUNTRY_CODE, COUNTRY_TH);

  const crcInput = `${payload}${CRC}04`;
  return crcInput + crc16Ccitt(crcInput);
}
