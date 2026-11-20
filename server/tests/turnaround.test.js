import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeTurnaroundTriage, simulateTurnaroundPlan } from "../turnaround-engine.js";
import { computeAltmanZScore, computeDuPont } from "../analysis-advanced.js";

describe("Turnaround Engine & Solvency Math", () => {
  test("calculates exact days to zero cash with verified baseline burn", () => {
    // 3 months of baseline data
    const rows = [{ month: "M1" }, { month: "M2" }, { month: "M3" }];
    const financials = {
      totalRevenue: 300000,  // 100,000 / mo
      totalExpenses: 450000, // 150,000 / mo
      latestCash: 50000,
      netProfit: -150000,
    };
    const interviewContext = {
      liquidCashNow: 100000, // Explicit verified bank balance takes precedence
    };

    const triage = computeTurnaroundTriage(rows, financials, interviewContext);
    const { vitalSigns } = triage;

    // Monthly burn = 150,000 - 100,000 = 50,000 / mo
    // Daily burn = 50,000 / 30 = 1666.666...
    // Days to zero = 100,000 / 1666.666... = 60 days
    assert.equal(vitalSigns.monthlyRevenue, 100000);
    assert.equal(vitalSigns.monthlyExpenses, 150000);
    assert.equal(vitalSigns.netMonthlyBurn, 50000);
    assert.equal(vitalSigns.liquidCashNow, 100000);
    assert.equal(vitalSigns.daysToZeroCash, 60);
    assert.equal(vitalSigns.solvencyStatus, "Critical Cash Stress (<90 Days)");
    assert.equal(vitalSigns.isCashFlowPositive, false);
    assert.ok(vitalSigns.zeroCashDate, "Zero cash date should be projected");
  });

  test("identifies immediate insolvency danger (<30 days runway)", () => {
    const rows = [{ month: "M1" }];
    const financials = {
      totalRevenue: 50000,
      totalExpenses: 110000, // 60,000 burn / mo -> 2,000 / day
    };
    const interviewContext = {
      liquidCashNow: 30000, // 30,000 / 2,000 = 15 days
    };

    const triage = computeTurnaroundTriage(rows, financials, interviewContext);
    assert.equal(triage.vitalSigns.daysToZeroCash, 15);
    assert.equal(triage.vitalSigns.solvencyStatus, "Immediate Insolvency Danger (<30 Days)");
  });

  test("handles profitable / zero-burn companies without crimson distress or NaN days", () => {
    const rows = [{ month: "M1" }, { month: "M2" }];
    const financials = {
      totalRevenue: 300000,  // 150,000 / mo
      totalExpenses: 200000, // 100,000 / mo
      latestCash: 80000,
    };
    const interviewContext = {
      liquidCashNow: 120000,
    };

    const triage = computeTurnaroundTriage(rows, financials, interviewContext);
    const { vitalSigns } = triage;

    assert.equal(vitalSigns.netMonthlyBurn, 0);
    assert.equal(vitalSigns.daysToZeroCash, null, "Profitable company should have null daysToZeroCash");
    assert.equal(vitalSigns.zeroCashDate, null);
    assert.equal(vitalSigns.isCashFlowPositive, true);
    assert.equal(vitalSigns.solvencyStatus, "Cash Flow Positive / Sustainable");

    // Simulation with profitable baseline remains sustainable
    const plan = simulateTurnaroundPlan(vitalSigns, triage.levers, []);
    assert.equal(plan.isNowSustainable, true);
    assert.equal(plan.recoveryBurn, 0);
    assert.equal(plan.recoveryDaysToZero, null);
  });

  test("guards against zero liquid cash without division-by-zero or NaN", () => {
    const rows = [{ month: "M1" }];
    const financials = {
      totalRevenue: 50000,
      totalExpenses: 100000, // 50,000 burn / mo
      latestCash: 0,
    };
    const interviewContext = {
      liquidCashNow: 0,
    };

    const triage = computeTurnaroundTriage(rows, financials, interviewContext);
    assert.equal(triage.vitalSigns.daysToZeroCash, 0);
    assert.equal(Number.isFinite(triage.vitalSigns.daysToZeroCash), true);
    assert.equal(isNaN(triage.vitalSigns.daysToZeroCash), false);
  });

  test("enforces exclusiveGroup mutual exclusion so competing levers never double-count", () => {
    const rows = [{ month: "M1" }];
    const financials = {
      totalRevenue: 50000,
      totalExpenses: 150000, // 100,000 / mo burn
    };
    const interviewContext = {
      liquidCashNow: 100000,
      monthlyPayroll: 60000,
      nonNegotiablePayrollPct: 70, // Negotiable payroll = 18,000
      monthlyVendorPayables: 40000,
      vendorDeferralLeeway: "60_days",
    };

    const triage = computeTurnaroundTriage(rows, financials, interviewContext);
    const { levers, presets } = triage;

    // Both payroll levers exist: payroll_deferral_15 (burnDelta = 2,700) and payroll_reduction_40 (burnDelta = 7,200)
    const deferralLever = levers.find((l) => l.id === "payroll_deferral_15");
    const reductionLever = levers.find((l) => l.id === "payroll_reduction_40");
    assert.ok(deferralLever, "payroll_deferral_15 must be generated");
    assert.ok(reductionLever, "payroll_reduction_40 must be generated");
    assert.equal(deferralLever.exclusiveGroup, "payroll");
    assert.equal(reductionLever.exclusiveGroup, "payroll");

    // When a user selects BOTH competing payroll levers, simulateTurnaroundPlan must only apply the first
    const conflictingPlan = simulateTurnaroundPlan(
      triage.vitalSigns,
      levers,
      ["payroll_deferral_15", "payroll_reduction_40"]
    );
    assert.equal(
      conflictingPlan.totalMonthlyBurnReduction,
      deferralLever.monthlyBurnDelta,
      "Competing exclusiveGroup levers must never double-count burn reduction"
    );

    // Both vendor levers exist: vendor_standstill_30 (cashImpact = 40,000) and vendor_workout_60 (cashImpact = 80,000)
    const vendorStandstill = levers.find((l) => l.id === "vendor_standstill_30");
    const vendorWorkout = levers.find((l) => l.id === "vendor_workout_60");
    assert.ok(vendorStandstill);
    assert.ok(vendorWorkout);
    assert.equal(vendorStandstill.exclusiveGroup, "vendors");
    assert.equal(vendorWorkout.exclusiveGroup, "vendors");

    const conflictingVendorPlan = simulateTurnaroundPlan(
      triage.vitalSigns,
      levers,
      ["vendor_standstill_30", "vendor_workout_60"]
    );
    assert.equal(
      conflictingVendorPlan.totalOneTimeCash,
      vendorStandstill.cashImpact,
      "Competing vendor deferral levers must never double-count cash infusion"
    );

    // Verify presets never contain multiple levers with the same exclusiveGroup
    for (const [presetName, leverIds] of Object.entries(presets)) {
      const seenGroups = new Set();
      for (const id of leverIds) {
        const lever = levers.find((l) => l.id === id);
        if (lever?.exclusiveGroup) {
          assert.equal(
            seenGroups.has(lever.exclusiveGroup),
            false,
            `Preset ${presetName} must not contain duplicate exclusiveGroup '${lever.exclusiveGroup}'`
          );
          seenGroups.add(lever.exclusiveGroup);
        }
      }
    }
  });

  test("refuses to fabricate proxy numbers when balance-sheet Assets/Equity are missing", () => {
    // Standard rows with only sales and expenses (no total_assets or equity)
    const incompleteRows = [
      { month: "2024-01", sales: 100000, expenses: 80000 },
      { month: "2024-02", sales: 110000, expenses: 85000 },
      { month: "2024-03", sales: 115000, expenses: 90000 },
    ];
    const financials = {
      totalRevenue: 325000,
      totalExpenses: 255000,
      netProfit: 70000,
      latestCash: 50000,
    };

    // Altman Z'-Score must return status: "insufficient_data" and available: false
    const altman = computeAltmanZScore(incompleteRows, financials);
    assert.equal(altman.available, false);
    assert.equal(altman.status, "insufficient_data");
    assert.equal(altman.score, null);
    assert.ok(altman.hint.includes("total_assets"));

    // DuPont must return status: "insufficient_data" and available: false
    const dupont = computeDuPont(incompleteRows, financials);
    assert.equal(dupont.available, false);
    assert.equal(dupont.status, "insufficient_data");

    // When balance sheet data IS provided, math computes honestly
    const completeRows = [
      { month: "2024-01", sales: 100000, expenses: 80000, total_assets: 500000, equity: 300000 },
      { month: "2024-02", sales: 110000, expenses: 85000, total_assets: 520000, equity: 315000 },
      { month: "2024-03", sales: 115000, expenses: 90000, total_assets: 550000, equity: 330000 },
    ];
    const completeAltman = computeAltmanZScore(completeRows, financials);
    assert.equal(completeAltman.available, true);
    assert.equal(completeAltman.status, "computed");
    assert.ok(typeof completeAltman.score === "number");
    assert.ok(["Safe", "Grey", "Distress"].includes(completeAltman.zone));

    const completeDuPont = computeDuPont(completeRows, financials);
    assert.equal(completeDuPont.available, true);
    assert.ok(typeof completeDuPont.roe === "number");
    assert.ok(typeof completeDuPont.assetTurnover === "number");
  });
});
