const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../ledger-core.js");

function entry(id, person, type, amount, date = "2026-09-01", dueDate = "") {
  return { id, person, type, amount, date, dueDate, category: "General", note: "", createdAt: `${date}T12:00:00.000Z` };
}

test("calculates balances person-wise across loans and repayments", () => {
  const entries = [entry("1", "Aarav", "lent", 1000), entry("2", "Aarav", "received", 350), entry("3", "Mira", "borrowed", 500), entry("4", "Mira", "paid", 125)];
  const summary = Core.summarize(entries, "2026-10-02");
  assert.equal(summary.people.find((p) => p.name === "Aarav").balance, 650);
  assert.equal(summary.people.find((p) => p.name === "Mira").balance, -375);
  assert.equal(summary.receive, 650); assert.equal(summary.pay, 375); assert.equal(summary.net, 275);
});

test("repayments consume oldest balances and clear their due dates", () => {
  const entries = [entry("1", "Aarav", "lent", 500, "2026-08-01", "2026-08-20"), entry("2", "Aarav", "lent", 700, "2026-09-01", "2026-10-20"), entry("3", "Aarav", "received", 600, "2026-09-15")];
  const person = Core.getPeople(entries, "2026-10-02")[0];
  assert.equal(person.balance, 600); assert.equal(person.openLots.length, 1); assert.equal(person.openLots[0].amount, 600); assert.equal(person.nextDueDate, "2026-10-20"); assert.equal(person.overdue, false);
});

test("marks only open overdue balances as overdue", () => {
  const settled = [entry("1", "Aarav", "lent", 500, "2026-08-01", "2026-08-20"), entry("2", "Aarav", "received", 500, "2026-08-21")];
  assert.equal(Core.getPeople(settled, "2026-10-02")[0].overdue, false);
  assert.equal(Core.getPeople([entry("3", "Mira", "borrowed", 100, "2026-08-01", "2026-09-01")], "2026-10-02")[0].overdue, true);
});

test("migrates version-one direction records without losing history", () => {
  const migrated = Core.normalizeEntry({ id: "old", person: "  Anaya  ", direction: "receive", amount: "250.50", date: "2026-01-02", note: "Lunch" });
  assert.equal(migrated.type, "lent"); assert.equal(migrated.person, "Anaya"); assert.equal(migrated.amount, 250.5); assert.equal(migrated.category, "General"); assert.equal(Core.isValidEntry(migrated), true);
});

test("CSV export preserves commas and quotes in details", () => {
  const csv = Core.toCsv([{ ...entry("1", "Aarav", "lent", 100), note: "Dinner, then \"cab\"" }]);
  assert.match(csv, /"Dinner, then ""cab"""/); assert.match(csv, /Money lent/);
});

test("rejects malformed and unbounded entries", () => {
  assert.equal(Core.isValidEntry(entry("", "Aarav", "lent", 10)), false);
  assert.equal(Core.isValidEntry(entry("1", "", "lent", 10)), false);
  assert.equal(Core.isValidEntry(entry("1", "Aarav", "lent", -2)), false);
  assert.equal(Core.isValidEntry(entry("1", "Aarav", "unknown", 10)), false);
});
