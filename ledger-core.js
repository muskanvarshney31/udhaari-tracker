(function attachLedgerCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.UdhaariCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function ledgerCoreFactory() {
  "use strict";
  const TYPES = Object.freeze({
    lent: { label: "Money lent", short: "Gave money", delta: 1, icon: "↓", kind: "receive" },
    borrowed: { label: "Money borrowed", short: "Took money", delta: -1, icon: "↑", kind: "pay" },
    received: { label: "Repayment received", short: "Got repaid", delta: -1, icon: "↙", kind: "settlement" },
    paid: { label: "Repayment made", short: "Paid back", delta: 1, icon: "↗", kind: "settlement" },
  });
  const CATEGORIES = ["General", "Food", "Travel", "Shopping", "Bills", "Rent", "Emergency", "Other"];
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
  function entryDelta(entry) { return roundMoney(Number(entry.amount) * (TYPES[entry.type]?.delta || 0)); }
  function personKey(name) { return String(name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase(); }
  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const legacyType = entry.direction === "receive" ? "lent" : entry.direction === "pay" ? "borrowed" : "";
    const type = TYPES[entry.type] ? entry.type : legacyType;
    return { id: String(entry.id || ""), person: String(entry.person || "").trim().replace(/\s+/g, " "), type, amount: roundMoney(entry.amount), date: String(entry.date || ""), dueDate: DATE_PATTERN.test(String(entry.dueDate || "")) ? String(entry.dueDate) : "", category: CATEGORIES.includes(entry.category) ? entry.category : "General", note: String(entry.note || "").trim().slice(0, 240), createdAt: String(entry.createdAt || new Date().toISOString()) };
  }
  function isValidEntry(entry) {
    const item = normalizeEntry(entry);
    return Boolean(item && item.id && item.person && TYPES[item.type] && Number.isFinite(item.amount) && item.amount > 0 && item.amount <= 999999999.99 && DATE_PATTERN.test(item.date));
  }
  function normalizeEntries(entries) { return Array.isArray(entries) ? entries.map(normalizeEntry).filter(isValidEntry) : []; }
  function compareChronological(a, b) { return a.date.localeCompare(b.date) || String(a.createdAt).localeCompare(String(b.createdAt)) || a.id.localeCompare(b.id); }
  function openLots(entries) {
    const lots = [];
    [...entries].sort(compareChronological).forEach((entry) => {
      let remaining = entryDelta(entry);
      while (Math.abs(remaining) >= 0.005) {
        const oppositeIndex = lots.findIndex((lot) => Math.sign(lot.amount) !== Math.sign(remaining));
        if (oppositeIndex < 0) break;
        const lot = lots[oppositeIndex];
        const applied = Math.min(Math.abs(remaining), Math.abs(lot.amount));
        lot.amount = roundMoney(lot.amount - Math.sign(lot.amount) * applied);
        remaining = roundMoney(remaining - Math.sign(remaining) * applied);
        if (Math.abs(lot.amount) < 0.005) lots.splice(oppositeIndex, 1);
      }
      if (Math.abs(remaining) >= 0.005) lots.push({ amount: remaining, date: entry.date, dueDate: entry.dueDate, entryId: entry.id });
    });
    return lots;
  }
  function getPeople(entries, dateToday) {
    const groups = new Map();
    normalizeEntries(entries).forEach((entry) => { const key = personKey(entry.person); if (!groups.has(key)) groups.set(key, { key, name: entry.person, entries: [] }); groups.get(key).entries.push(entry); });
    return [...groups.values()].map((person) => {
      person.entries.sort(compareChronological); person.balance = roundMoney(person.entries.reduce((sum, entry) => sum + entryDelta(entry), 0)); person.count = person.entries.length; person.lastDate = person.entries[person.entries.length - 1]?.date || ""; person.openLots = openLots(person.entries);
      const dueDates = person.openLots.map((lot) => lot.dueDate).filter(Boolean).sort(); person.nextDueDate = dueDates[0] || ""; person.overdue = Boolean(person.nextDueDate && person.nextDueDate < dateToday); return person;
    }).sort((a, b) => Number(b.overdue) - Number(a.overdue) || Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));
  }
  function summarize(entries, dateToday) {
    const people = getPeople(entries, dateToday); const receivePeople = people.filter((person) => person.balance > 0.004); const payPeople = people.filter((person) => person.balance < -0.004); const receive = roundMoney(receivePeople.reduce((sum, person) => sum + person.balance, 0)); const pay = roundMoney(payPeople.reduce((sum, person) => sum + Math.abs(person.balance), 0));
    return { people, receivePeople, payPeople, receive, pay, net: roundMoney(receive - pay), overduePeople: people.filter((person) => person.overdue) };
  }
  function csvEscape(value) { let text = String(value ?? ""); if (/^[=+\-@]/.test(text)) text = `'${text}`; return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
  function toCsv(entries) { const rows = [["Date", "Person", "Transaction", "Amount (INR)", "Due date", "Category", "Details"]]; normalizeEntries(entries).sort(compareChronological).forEach((entry) => rows.push([entry.date, entry.person, TYPES[entry.type].label, entry.amount.toFixed(2), entry.dueDate, entry.category, entry.note])); return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n"); }
  return { TYPES, CATEGORIES, normalizeEntry, normalizeEntries, isValidEntry, entryDelta, personKey, compareChronological, openLots, getPeople, summarize, toCsv, roundMoney };
});
