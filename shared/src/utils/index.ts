/**
 * Integer money arithmetic for variant pricing.
 */
export function calculateVariantPrice(
  basePriceMinor: bigint,
  surchargeMinor: bigint
): bigint {
  if (basePriceMinor < 0n || surchargeMinor < 0n) {
    throw new Error("Invalid price");
  }
  return basePriceMinor + surchargeMinor;
}

/**
 * Recursively converts BigInt and Decimal values into decimal strings
 * for safe JSON serialization.
 */
export function serializeBigInts<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "bigint") {
    return data.toString() as unknown as T;
  }

  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }

  // Handle Prisma Decimal objects or similar that have .toFixed() / .toString()
  if (
    typeof data === "object" &&
    data !== null &&
    "d" in data &&
    "e" in data &&
    "s" in data &&
    typeof (data as any).toString === "function"
  ) {
    return (data as any).toString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeBigInts(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const serialized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeBigInts(value);
    }
    return serialized as T;
  }

  return data;
}

/**
 * Format minor units into human readable currency display.
 * E.g. 200000 minor INR -> "₹2,000.00"
 */
export function formatMinorToCurrency(
  amountMinor: string | bigint | number,
  currency = "INR"
): string {
  const minorStr = typeof amountMinor === "bigint" ? amountMinor.toString() : String(amountMinor);
  const isNegative = minorStr.startsWith("-");
  const cleanStr = isNegative ? minorStr.slice(1) : minorStr;

  const padded = cleanStr.padStart(3, "0");
  const whole = padded.slice(0, -2) || "0";
  const fraction = padded.slice(-2);

  const numWhole = parseInt(whole, 10);
  let formattedWhole = whole;
  if (!isNaN(numWhole)) {
    formattedWhole = numWhole.toLocaleString("en-IN");
  }

  const sign = isNegative ? "-" : "";
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${sign}${symbol}${formattedWhole}.${fraction}`;
}
