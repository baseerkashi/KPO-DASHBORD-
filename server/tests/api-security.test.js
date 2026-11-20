import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// 1. Point to an isolated temporary SQLite DB BEFORE importing server modules
const tempDbPath = path.join(
  os.tmpdir(),
  `vertex-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DB_PATH = tempDbPath;
process.env.NODE_ENV = "test";
process.env.DISABLE_LISTEN = "true";

const { default: app } = await import("../index.js");
const { default: db } = await import("../db.js");

function extractJwtCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(/vertex_jwt=([^;]+)/);
  return match ? `vertex_jwt=${match[1]}` : null;
}

describe("API & Security Test Suite (Multi-Tenant & IDOR)", () => {
  let server;
  let baseUrl;
  let userACookie;
  let userBCookie;
  let userAId;
  let clientAId;
  let analysisAId;

  before(async () => {
    // Boot server on random free ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(tempDbPath + "-wal")) fs.unlinkSync(tempDbPath + "-wal");
      if (fs.existsSync(tempDbPath + "-shm")) fs.unlinkSync(tempDbPath + "-shm");
    } catch (e) {
      // Ignore transient file lock on Windows
    }
  });

  test("a) Signup and login sets httpOnly cookie and GET /auth/me succeeds", async () => {
    // 1. Signup User A
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "usera@turnaround.test",
        password: "Password123!",
        name: "User Alpha",
      }),
    });

    assert.equal(signupRes.status, 200);
    const signupData = await signupRes.json();
    assert.equal(signupData.user.email, "usera@turnaround.test");
    userAId = signupData.user.id;

    const signupSetCookie = signupRes.headers.get("set-cookie");
    assert.ok(signupSetCookie, "Signup must issue a Set-Cookie header");
    assert.ok(signupSetCookie.includes("vertex_jwt"), "Cookie must be named vertex_jwt");
    assert.ok(signupSetCookie.toLowerCase().includes("httponly"), "Cookie must be HttpOnly");

    // 2. Login User A
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "usera@turnaround.test",
        password: "Password123!",
      }),
    });

    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.user.email, "usera@turnaround.test");
    const loginSetCookie = loginRes.headers.get("set-cookie");
    assert.ok(loginSetCookie.toLowerCase().includes("httponly"));
    userACookie = extractJwtCookie(loginRes);
    assert.ok(userACookie, "Extracted JWT cookie string must exist");

    // 3. Verify GET /auth/me with the httpOnly cookie
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: userACookie },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, "usera@turnaround.test");
    assert.equal(meData.user.role, "analyst");

    // 4. Create User B for IDOR testing
    const signupB = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "userb@attacker.test",
        password: "Password456!",
        name: "User Beta",
      }),
    });
    assert.equal(signupB.status, 200);
    userBCookie = extractJwtCookie(signupB);
    assert.ok(userBCookie);
  });

  test("b) IDOR Protection: User B receives 404/403 when requesting User A resources", async () => {
    // 1. User A creates Client A
    const clientRes = await fetch(`${baseUrl}/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        company_name: "Apex Logistics LLC",
        industry: "logistics",
      }),
    });
    assert.equal(clientRes.status, 200);
    const clientData = await clientRes.json();
    clientAId = clientData.id;
    assert.ok(clientAId);

    // 2. User A uploads an Analysis for Client A
    const csvContent = `Month,Revenue,Expenses,Cash,Debt
2024-01,150000,180000,100000,20000
2024-02,160000,195000,85000,19000
2024-03,155000,190000,70000,18000`;

    const formData = new FormData();
    const blob = new Blob([csvContent], { type: "text/csv" });
    formData.append("file", blob, "monthly_financials.csv");
    formData.append("client_id", clientAId);
    formData.append("period_title", "Q1 2024 Distress Review");

    const uploadRes = await fetch(`${baseUrl}/analyses`, {
      method: "POST",
      headers: { Cookie: userACookie },
      body: formData,
    });
    assert.equal(uploadRes.status, 200);
    const uploadData = await uploadRes.json();
    analysisAId = uploadData.id;
    assert.ok(analysisAId);

    // 3. User B attempts unauthorized access to User A's Client
    const idorGetClient = await fetch(`${baseUrl}/clients/${clientAId}`, {
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorGetClient.status, 404, "User B must not access User A's client details");

    const idorGetAnalyses = await fetch(`${baseUrl}/clients/${clientAId}/analyses`, {
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorGetAnalyses.status, 404, "User B must not list User A's analyses");

    const idorCompare = await fetch(`${baseUrl}/clients/${clientAId}/compare?ids=${analysisAId},${analysisAId}`, {
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorCompare.status, 404, "User B must not run comparison on User A's company");

    // 4. User B attempts unauthorized access to User A's Analysis
    const idorGetAnalysis = await fetch(`${baseUrl}/analyses/${analysisAId}`, {
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorGetAnalysis.status, 404, "User B must not fetch User A's analysis record");

    // 5. User B attempts unauthorized PATCH on User A's interview
    const idorPatchInterview = await fetch(`${baseUrl}/analyses/${analysisAId}/interview`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: userBCookie,
      },
      body: JSON.stringify({ liquidCashNow: 999999 }),
    });
    assert.equal(idorPatchInterview.status, 404, "User B must not modify User A's interview");

    // 6. User B attempts unauthorized PDF download
    const idorGetReport = await fetch(`${baseUrl}/analyses/${analysisAId}/report`, {
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorGetReport.status, 404, "User B must not download User A's PDF memo");

    // 7. User B attempts unauthorized DELETE
    const idorDeleteAnalysis = await fetch(`${baseUrl}/analyses/${analysisAId}`, {
      method: "DELETE",
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorDeleteAnalysis.status, 404, "User B must not delete User A's analysis");

    const idorDeleteClient = await fetch(`${baseUrl}/clients/${clientAId}`, {
      method: "DELETE",
      headers: { Cookie: userBCookie },
    });
    assert.equal(idorDeleteClient.status, 404, "User B must not delete User A's client");
  });

  test("c) Non-admin user receives 403 on GET /audit-log", async () => {
    // User A has role: 'analyst' (non-admin)
    const auditRes = await fetch(`${baseUrl}/audit-log`, {
      headers: { Cookie: userACookie },
    });
    assert.equal(auditRes.status, 403);
    const err = await auditRes.json();
    assert.ok(err.error.toLowerCase().includes("admin"), "Expected admin restriction message");
  });

  test("d) Upload CSV -> save interview & selected levers -> download PDF report returns application/pdf", async () => {
    // 1. User A updates diagnostic interview with verified turnaround levers
    const patchRes = await fetch(`${baseUrl}/analyses/${analysisAId}/interview`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        liquidCashNow: 120000,
        monthlyPayroll: 50000,
        nonNegotiablePayrollPct: 75,
        collectibleOverdueAR: 35000,
        monthlyVendorPayables: 25000,
        vendorDeferralLeeway: "30_days",
        selectedLeverIds: ["early_ar_discount", "vendor_standstill_30"],
      }),
    });

    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.success, true);
    assert.ok(patchData.turnaround.vitalSigns);
    assert.ok(patchData.turnaround.vitalSigns.daysToZeroCash > 0);

    // 2. User A downloads Executive Turnaround Memo PDF
    const reportRes = await fetch(`${baseUrl}/analyses/${analysisAId}/report`, {
      headers: { Cookie: userACookie },
    });

    assert.equal(reportRes.status, 200);
    const contentType = reportRes.headers.get("content-type");
    assert.ok(contentType.includes("application/pdf"), `Expected application/pdf, received ${contentType}`);

    const buffer = await reportRes.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, `PDF report must have non-empty bytes (got ${buffer.byteLength})`);

    // Verify PDF header magic bytes "%PDF"
    const headerMagic = Buffer.from(buffer.slice(0, 4)).toString();
    assert.equal(headerMagic, "%PDF", "Report header must begin with %PDF");
  });
});
