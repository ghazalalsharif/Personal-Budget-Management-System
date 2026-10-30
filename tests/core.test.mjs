import test from "node:test";
import assert from "node:assert/strict";
import {
  cents,
  validate,
  empty,
  summary,
  filterEntries,
  csv,
  save,
} from "../docs/core.js";
const entry = (id, amount, income = false, date = "2026-10-01") => ({
  id,
  date,
  amount,
  income,
  category: income ? "الراتب" : "الأكل",
  note: "",
});
test("500 allocated, 50 spent leaves 450 and 10%", () => {
  const d = {
      version: 1,
      entries: [entry("a", 5000)],
      limits: [{ month: "2026-10", category: "الأكل", amount: 50000 }],
    },
    s = summary(d, "2026-10");
  assert.equal(s.envelopes[0].remaining, 45000);
  assert.equal(s.envelopes[0].percent, 10);
  assert.equal(s.income, 0);
});
test("salary is not reduced twice by allocation", () => {
  const d = {
    version: 1,
    entries: [entry("a", 500000, true), entry("b", 5000)],
    limits: [{ month: "2026-10", category: "الأكل", amount: 50000 }],
  };
  assert.equal(summary(d, "2026-10").remaining, 495000);
});
test("decimal precision and Arabic digits", () => {
  assert.equal(cents("٠٫١٠"), 10);
  assert.equal(cents("0.20") + cents("0.10"), 30);
  for (const n of ["0", "-2", "NaN", "Infinity", "1.001", "1e3", "1000000001"])
    assert.throws(() => cents(n));
});
test("invalid dates, duplicate IDs and duplicate translated budgets rejected", () => {
  assert.throws(() =>
    validate({
      version: 1,
      entries: [entry("a", 10, false, "2026-02-30")],
      limits: [],
    }),
  );
  assert.throws(() =>
    validate({
      version: 1,
      entries: [entry("a", 10), entry("a", 20)],
      limits: [],
    }),
  );
  assert.throws(() =>
    validate({
      version: 1,
      entries: [],
      limits: [
        { month: "2026-10", category: "الأكل", amount: 100 },
        { month: "2026-10", category: "الطعام", amount: 200 },
      ],
    }),
  );
});
test("old category names preserved as one envelope", () => {
  const d = validate({
    version: 1,
    entries: [{ ...entry("a", 5000), category: "الطعام" }],
    limits: [{ month: "2026-10", category: "الطعام", amount: 50000 }],
  });
  assert.equal(summary(d, "2026-10").envelopes[0].remaining, 45000);
  assert.equal(d.entries[0].category, "الأكل");
});
test("months and uncovered expenses stay separate", () => {
  const d = {
    version: 1,
    entries: [entry("a", 1000, true, "2026-09-01"), entry("b", 500)],
    limits: [],
  };
  const s = summary(d, "2026-10");
  assert.equal(s.income, 0);
  assert.equal(s.envelopes[0].percent, null);
});
test("overspending remains signed", () => {
  const d = {
    version: 1,
    entries: [entry("a", 60000)],
    limits: [{ month: "2026-10", category: "الأكل", amount: 50000 }],
  };
  assert.equal(summary(d, "2026-10").envelopes[0].remaining, -10000);
});
test("inclusive filters and invalid interval", () => {
  const d = { ...empty(), entries: [entry("a", 10), entry("b", 20, true)] };
  assert.equal(
    filterEntries(d, {
      from: "2026-10-01",
      to: "2026-10-01",
      type: "expense",
      query: "الأكل",
    }).length,
    1,
  );
  assert.throws(() =>
    filterEntries(d, { from: "2026-11-01", to: "2026-10-01" }),
  );
});
test("storage failure never returns committed data", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw Error("QuotaExceeded");
    },
  };
  assert.throws(() => save(storage, "test", empty()));
});
test("CSV escapes formula and quotes", () => {
  assert.match(
    csv([{ ...entry("a", 120), note: '=1+1,"x"' }]),
    /"'=1\+1,""x"""/,
  );
});
