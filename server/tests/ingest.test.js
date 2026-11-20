import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parse } from "csv-parse/sync";
import { cleanNumeric, ruleBasedDetect, smartIngest } from "../smart-ingest.js";

describe("Smart Ingestion & Data Scrubbing", () => {
  describe("cleanNumeric", () => {
    test("strips currency symbols, spaces, and thousand-separators", () => {
      assert.equal(cleanNumeric("$1,234.56"), 1234.56);
      assert.equal(cleanNumeric("₹ 50,000"), 50000);
      assert.equal(cleanNumeric("€999,999"), 999999);
      assert.equal(cleanNumeric("£42,100.50"), 42100.5);
      assert.equal(cleanNumeric("¥1,000,000"), 1000000);
    });

    test("handles accounting negative parentheses: (1,200) -> -1200", () => {
      assert.equal(cleanNumeric("(1,200)"), -1200);
      assert.equal(cleanNumeric("(₹5,000.50)"), -5000.5);
      assert.equal(cleanNumeric("($100,000)"), -100000);
      assert.equal(cleanNumeric("(-500)"), -500);
    });

    test("parses Indian Lakh and Crore notations", () => {
      assert.equal(cleanNumeric("5 Lakh"), 500000);
      assert.equal(cleanNumeric("12.5 Lakhs"), 1250000);
      assert.equal(cleanNumeric("3.5la"), 350000);
      assert.equal(cleanNumeric("2.5 Cr"), 25000000);
      assert.equal(cleanNumeric("1 Crore"), 10000000);
      assert.equal(cleanNumeric("0.75cr"), 7500000);
    });

    test("parses K and M scale notations", () => {
      assert.equal(cleanNumeric("250k"), 250000);
      assert.equal(cleanNumeric("45.5K"), 45500);
      assert.equal(cleanNumeric("1.5M"), 1500000);
      assert.equal(cleanNumeric("10m"), 10000000);
    });

    test("handles percentages and rejects non-numeric/empty strings", () => {
      assert.equal(cleanNumeric("18.5%"), 18.5);
      assert.equal(cleanNumeric(""), null);
      assert.equal(cleanNumeric(null), null);
      assert.equal(cleanNumeric(undefined), null);
      assert.equal(cleanNumeric("N/A"), null);
      assert.equal(cleanNumeric("Pending Review"), null);
    });
  });

  describe("ruleBasedDetect", () => {
    test("detects standard financial header mappings", () => {
      const headers = ["Period", "Gross Revenue", "Total Expenses", "Cash in Hand", "Total Liabilities"];
      const { mapping, confidence, method } = ruleBasedDetect(headers);

      assert.equal(mapping.month, "Period");
      assert.equal(mapping.sales, "Gross Revenue");
      assert.equal(mapping.expenses, "Total Expenses");
      assert.equal(mapping.cash, "Cash in Hand");
      assert.equal(mapping.debt, "Total Liabilities");
      assert.equal(method, "rule-based");
      assert.ok(confidence >= 3);
    });
  });

  describe("smartIngest End-to-End", () => {
    test("cleans, strips summary totals, and formats messy financial records", async () => {
      const csvData = `Date,Topline Revenue,Operating Cost,Bank Balance
Jan 2024,"$120,000","(85,000)","$50,000"
Feb 2024,"1.5 Lakh","95,000","45,000"
Mar 2024,"140000","₹ 1,10,000","38,000"
Total,"$410,000","$290,000","$38,000"`;

      const records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
      const headers = Object.keys(records[0]);

      const result = await smartIngest(records, headers, null);

      // Total row must be removed
      assert.equal(result.rows.length, 3, "Summary Total row must be filtered out");
      assert.equal(result.droppedCount, 1);

      // Verify row 1
      assert.equal(result.rows[0].month, "Jan 2024");
      assert.equal(result.rows[0].sales, 120000);
      assert.equal(result.rows[0].expenses, -85000);
      assert.equal(result.rows[0].cash, 50000);

      // Verify row 2 (1.5 Lakh -> 150,000)
      assert.equal(result.rows[1].sales, 150000);
      assert.equal(result.rows[1].expenses, 95000);

      // Verify row 3 (₹ 1,10,000 -> 110,000)
      assert.equal(result.rows[2].expenses, 110000);
    });

    test("handles empty and malformed records gracefully", async () => {
      // Empty records
      const emptyResult = await smartIngest([], [], null);
      assert.equal(emptyResult.rows.length, 0);
      assert.ok(emptyResult.warnings.some((w) => w.includes("Empty dataset")));

      // Records with unparseable numbers are skipped
      const badRecords = [
        { Date: "Jan 2024", Revenue: "invalid", Expenses: "none" },
        { Date: "Feb 2024", Revenue: "$50,000", Expenses: "$30,000" },
      ];
      const result = await smartIngest(badRecords, ["Date", "Revenue", "Expenses"], null);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].month, "Feb 2024");
      assert.equal(result.rows[0].sales, 50000);
      assert.ok(result.warnings.some((w) => w.includes("Skipped 1 empty or unrecognizable row")));
    });

    test("rejects malformed raw CSV formats", () => {
      const corruptCsv = `Date,Revenue,Expenses\n"Jan 2024,50000,40000\n"Unclosed quote row`;
      assert.throws(() => {
        parse(corruptCsv, { columns: true, skip_empty_lines: true });
      });
    });
  });
});
