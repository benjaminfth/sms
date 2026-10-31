import { prisma } from "../database/prisma";

export class SequenceService {
  private static syncedSequences = new Set<string>();

  /**
   * Synchronizes sequence with existing records in the database so that
   * nextval() always produces a number strictly greater than existing numbers.
   */
  private static async syncSequence(prefix: "QUO" | "SUB" | "INV", year: number): Promise<void> {
    const seqName = `${prefix.toLowerCase()}_number_seq`;
    await prisma.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS "${seqName}" START 1;`
    );

    const tableName = prefix === "QUO" ? "quotations" : prefix === "SUB" ? "subscriptions" : "invoices";
    const colName = prefix === "QUO" ? "quotationNumber" : prefix === "SUB" ? "subscriptionNumber" : "invoiceNumber";

    const pattern = `${prefix}-${year}-%`;
    const rows: Array<{ num: string }> = await prisma.$queryRawUnsafe(
      `SELECT "${colName}" as num FROM "${tableName}" WHERE "${colName}" LIKE '${pattern}' ORDER BY "${colName}" DESC LIMIT 1;`
    );

    if (rows.length > 0 && rows[0]?.num) {
      const match = rows[0].num.match(/-(\d+)$/);
      if (match && match[1]) {
        const maxVal = parseInt(match[1], 10);
        if (!isNaN(maxVal) && maxVal > 0) {
          await prisma.$executeRawUnsafe(
            `SELECT setval('"${seqName}"', ${maxVal});`
          );
        }
      }
    }
  }

  /**
   * Generates a sequential, concurrency-safe formatted number.
   * e.g., QUO-2026-0001, SUB-2026-0001, INV-2026-0001
   */
  static async getNextNumber(
    prefix: "QUO" | "SUB" | "INV",
    year = new Date().getFullYear()
  ): Promise<string> {
    const seqName = `${prefix.toLowerCase()}_number_seq`;
    const syncKey = `${prefix}_${year}`;

    if (!this.syncedSequences.has(syncKey)) {
      await this.syncSequence(prefix, year);
      this.syncedSequences.add(syncKey);
    }

    const result: Array<{ val: bigint | number | string }> = await prisma.$queryRawUnsafe(
      `SELECT nextval('"${seqName}"') as val;`
    );

    const seqVal = Number(result[0]?.val ?? 1);
    const padded = String(seqVal).padStart(4, "0");
    return `${prefix}-${year}-${padded}`;
  }
}
