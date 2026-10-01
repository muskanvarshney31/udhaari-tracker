"use strict";

const Core = window.UdhaariCore;
const STORAGE_KEY = "udhaari-ledger-v2";
const LEGACY_STORAGE_KEY = "udhaari-ledger-v1";
const state = { entries: loadEntries(), peopleSearch: "", peopleFilter: "all", historyFilter: "all", historySearch: "", openPerson: "" };

const $ = (selector) => document.querySelector(selector);
const elements = {
  netBalance: $("#netBalance"), netCaption: $("#netCaption"), totalReceive: $("#totalReceive"), receiveCaption: $("#receiveCaption"), totalPay: $("#totalPay"), payCaption: $("#payCaption"), balanceTrack: $("#balanceTrack"), overdueCount: $("#overdueCount"), overdueCaption: $("#overdueCaption"),
  peopleGrid: $("#peopleGrid"), peopleEmpty: $("#peopleEmpty"), peopleEmptyCopy: $("#peopleEmptyCopy"), peopleSearch: $("#peopleSearch"), peopleFilters: $("#peopleFilters"),
  historyList: $("#historyList"), historyEmpty: $("#historyEmpty"), historyFilter: $("#historyFilter"), historySearch: $("#historySearch"),
  entryDialog: $("#entryDialog"), entryForm: $("#entryForm"), entryId: $("#entryId"), dialogEyebrow: $("#dialogEyebrow"), dialogTitle: $("#dialogTitle"), personName: $("#personName"), personSuggestions: $("#personSuggestions"), amount: $("#amount"), entryDate: $("#entryDate"), dueDate: $("#dueDate"), dueDateField: $("#dueDateField"), category: $("#category"), note: $("#note"),
  personDialog: $("#personDialog"), personDialogTitle: $("#personDialogTitle"), personDialogSummary: $("#personDialogSummary"), personQuickActions: $("#personQuickActions"), personDialogHistory: $("#personDialogHistory"),
  backupDialog: $("#backupDialog"), importInput: $("#importInput"), importMessage: $("#importMessage"), backupStats: $("#backupStats"), toast: $("#toast"),
};

function loadEntries() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(current)) return Core.normalizeEntries(current);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
    const migrated = Core.normalizeEntries(legacy);
    if (migrated.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch { return []; }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  window.AndroidBackup?.dataChanged?.(JSON.stringify({ app: "Udhaari", version: 2, entries: state.entries }));
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function money(value, includeSign = false) {
  const number = Number(value) || 0;
  const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: number % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(Math.abs(number));
  return includeSign && Math.abs(number) >= .005 ? `${number > 0 ? "+" : "−"}${formatted}` : formatted;
}

function displayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function escapeHtml(value) {
  const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML;
}

function newId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function personKind(balance) { return balance > .004 ? "receive" : balance < -.004 ? "pay" : "settled"; }
function personLabel(balance) { return balance > .004 ? "You'll receive" : balance < -.004 ? "You need to pay" : "Settled up"; }

function render() { renderSummary(); renderPeople(); renderHistory(); updateSuggestions(); }

function renderSummary() {
  const summary = Core.summarize(state.entries, today());
  const totalMovement = summary.receive + summary.pay;
  elements.netBalance.textContent = money(summary.net, true);
  elements.netCaption.textContent = summary.net > 0 ? "Overall, you will receive" : summary.net < 0 ? "Overall, you need to pay" : "You are all settled up";
  elements.totalReceive.textContent = money(summary.receive);
  elements.receiveCaption.textContent = `Across ${summary.receivePeople.length} ${summary.receivePeople.length === 1 ? "person" : "people"}`;
  elements.totalPay.textContent = money(summary.pay);
  elements.payCaption.textContent = `Across ${summary.payPeople.length} ${summary.payPeople.length === 1 ? "person" : "people"}`;
  elements.balanceTrack.style.width = totalMovement ? `${Math.max(5, Math.min(95, summary.receive / totalMovement * 100))}%` : "50%";
  elements.overdueCount.textContent = String(summary.overduePeople.length);
  elements.overdueCaption.textContent = summary.overduePeople.length ? `${summary.overduePeople.length === 1 ? "Person" : "People"} past a due date` : "Nothing needs attention";
  elements.overdueCount.closest(".due-card").classList.toggle("attention", summary.overduePeople.length > 0);
}

function renderPeople() {
  const query = state.peopleSearch.trim().toLocaleLowerCase();
  const people = Core.getPeople(state.entries, today()).filter((person) => {
    if (!person.name.toLocaleLowerCase().includes(query)) return false;
    if (state.peopleFilter === "receive") return person.balance > .004;
    if (state.peopleFilter === "pay") return person.balance < -.004;
    if (state.peopleFilter === "settled") return Math.abs(person.balance) < .005;
    if (state.peopleFilter === "overdue") return person.overdue;
    return true;
  });
  elements.peopleGrid.innerHTML = people.map((person) => {
    const kind = personKind(person.balance);
    const due = person.overdue ? `<p class="person-due">Overdue since ${escapeHtml(displayDate(person.nextDueDate))}</p>` : person.nextDueDate ? `<p class="person-due" style="color:var(--ink-soft)">Due ${escapeHtml(displayDate(person.nextDueDate))}</p>` : "";
    return `<article class="person-card ${person.overdue ? "overdue-card" : ""}" tabindex="0" role="button" data-person="${escapeHtml(person.name)}" aria-label="Open ${escapeHtml(person.name)}'s ledger"><div class="avatar">${escapeHtml(person.name.charAt(0).toUpperCase())}</div><div class="person-info"><p class="person-name">${escapeHtml(person.name)}</p><p class="person-detail">${personLabel(person.balance)} · ${person.count} ${person.count === 1 ? "transaction" : "transactions"}</p>${due}</div><p class="person-amount amount-${kind}">${money(person.balance, true)}</p></article>`;
  }).join("");
  elements.peopleEmptyCopy.textContent = state.entries.length ? "Try another search or balance filter." : "Add your first transaction and it will appear here.";
  elements.peopleEmpty.classList.toggle("show", people.length === 0);
  elements.peopleGrid.style.display = people.length ? "grid" : "none";
}

function renderHistory() {
  const query = state.historySearch.trim().toLocaleLowerCase();
  const entries = [...state.entries].filter((entry) => {
    if (state.historyFilter !== "all" && entry.type !== state.historyFilter) return false;
    return !query || `${entry.person} ${entry.note} ${entry.category} ${Core.TYPES[entry.type].label}`.toLocaleLowerCase().includes(query);
  }).sort((a, b) => -Core.compareChronological(a, b));
  elements.historyList.innerHTML = entries.map((entry) => {
    const type = Core.TYPES[entry.type]; const due = entry.dueDate && ["lent", "borrowed"].includes(entry.type); const overdue = due && entry.dueDate < today();
    const amountKind = entry.type === "lent" || entry.type === "received" ? "receive" : "pay";
    return `<article class="history-item"><div class="history-icon ${type.kind === "settlement" ? "settlement-icon" : `${type.kind}-icon`}" aria-hidden="true">${type.icon}</div><div><p class="history-person">${escapeHtml(entry.person)}</p><span class="history-date">${displayDate(entry.date)}</span></div><p class="history-note"><span class="history-type">${escapeHtml(type.label)}</span>${escapeHtml(entry.note || entry.category)}</p><div><p class="history-amount amount-${amountKind}">${money(entry.amount)}</p><span class="history-meta ${overdue ? "overdue" : ""}">${due ? `${overdue ? "Was due" : "Due"} ${displayDate(entry.dueDate)}` : escapeHtml(entry.category)}</span></div><div class="item-menu"><button class="item-action" type="button" data-edit="${entry.id}" aria-label="Edit transaction" title="Edit">✎</button><button class="item-action" type="button" data-delete="${entry.id}" aria-label="Delete transaction" title="Delete">×</button></div></article>`;
  }).join("");
  elements.historyList.style.display = entries.length ? "block" : "none";
  elements.historyEmpty.classList.toggle("show", entries.length === 0);
}

function updateSuggestions() {
  elements.personSuggestions.innerHTML = Core.getPeople(state.entries, today()).map((person) => `<option value="${escapeHtml(person.name)}"></option>`).join("");
}

function updateDueDateVisibility() {
  const type = elements.entryForm.elements.type.value;
  const supportsDueDate = ["lent", "borrowed"].includes(type);
  elements.dueDateField.hidden = !supportsDueDate;
  if (!supportsDueDate) elements.dueDate.value = "";
}

function openEntryDialog(entry = null, preset = {}) {
  elements.entryForm.reset();
  const editing = Boolean(entry?.id);
  elements.entryId.value = editing ? entry.id : "";
  elements.dialogEyebrow.textContent = editing ? "UPDATE TRANSACTION" : "NEW TRANSACTION";
  elements.dialogTitle.textContent = editing ? "Edit transaction" : "Add transaction";
  elements.personName.value = entry?.person || preset.person || "";
  elements.amount.value = entry?.amount || preset.amount || "";
  elements.entryDate.value = entry?.date || today();
  elements.dueDate.value = entry?.dueDate || "";
  elements.dueDate.min = elements.entryDate.value;
  elements.category.value = entry?.category || preset.category || "General";
  elements.note.value = entry?.note || preset.note || "";
  const type = entry?.type || preset.type || "lent";
  elements.entryForm.querySelector(`[name="type"][value="${type}"]`).checked = true;
  updateDueDateVisibility(); closeDialog(elements.personDialog); elements.entryDialog.showModal();
  setTimeout(() => (preset.person ? elements.amount : elements.personName).focus(), 50);
}

function closeDialog(dialog) { if (dialog.open) dialog.close(); }

function handleEntrySubmit(event) {
  event.preventDefault();
  const id = elements.entryId.value; const existing = state.entries.find((item) => item.id === id);
  const typedName = elements.personName.value.trim().replace(/\s+/g, " ");
  const knownPerson = Core.getPeople(state.entries, today()).find((person) => person.key === Core.personKey(typedName));
  const entry = Core.normalizeEntry({ id: id || newId(), person: knownPerson?.name || typedName, type: elements.entryForm.elements.type.value, amount: elements.amount.value, date: elements.entryDate.value, dueDate: elements.dueDate.value, category: elements.category.value, note: elements.note.value, createdAt: existing?.createdAt || new Date().toISOString() });
  if (!Core.isValidEntry(entry)) { showToast("Please check the name, amount and date"); return; }
  if (entry.dueDate && entry.dueDate < entry.date) { showToast("Due date cannot be before the transaction date"); return; }
  state.entries = id ? state.entries.map((item) => item.id === id ? entry : item) : [...state.entries, entry];
  saveEntries(); render(); closeDialog(elements.entryDialog); showToast(id ? "Transaction updated" : "Transaction saved");
}

function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !window.confirm(`Delete the ${money(entry.amount)} transaction for ${entry.person}?`)) return;
  const refreshOpenPerson = elements.personDialog.open;
  state.entries = state.entries.filter((item) => item.id !== id); saveEntries(); render();
  if (refreshOpenPerson && state.openPerson) { const personStillExists = Core.getPeople(state.entries, today()).some((person) => person.key === Core.personKey(state.openPerson)); if (personStillExists) openPersonLedger(state.openPerson); else closeDialog(elements.personDialog); }
  showToast("Transaction deleted");
}

function openPersonLedger(name) {
  const person = Core.getPeople(state.entries, today()).find((item) => item.key === Core.personKey(name));
  if (!person) return;
  state.openPerson = person.name; elements.personDialogTitle.textContent = person.name;
  const dueText = person.overdue ? `Overdue since ${displayDate(person.nextDueDate)}` : person.nextDueDate ? `Next due ${displayDate(person.nextDueDate)}` : "No active due date";
  elements.personDialogSummary.innerHTML = `<span>${personLabel(person.balance)}</span><strong>${money(person.balance, true)}</strong><small>${dueText} · ${person.count} ${person.count === 1 ? "transaction" : "transactions"}</small>`;
  const settlementType = person.balance > .004 ? "received" : "paid";
  elements.personQuickActions.innerHTML = Math.abs(person.balance) >= .005 ? `<button class="primary-button" type="button" data-settle="${settlementType}" data-person-name="${escapeHtml(person.name)}" data-balance="${Math.abs(person.balance)}">Record repayment</button><button class="secondary-button" type="button" data-new-for-person="${escapeHtml(person.name)}">Add another</button>` : `<button class="secondary-button" type="button" data-new-for-person="${escapeHtml(person.name)}">Add another transaction</button>`;
  elements.personDialogHistory.innerHTML = [...person.entries].sort((a, b) => -Core.compareChronological(a, b)).map((entry) => { const type = Core.TYPES[entry.type]; return `<div class="person-ledger-row"><span class="ledger-dot">${type.icon}</span><div><p><b>${escapeHtml(type.label)}</b>${entry.note ? ` · ${escapeHtml(entry.note)}` : ""}</p><small>${displayDate(entry.date)} · ${escapeHtml(entry.category)}${entry.dueDate ? ` · Due ${displayDate(entry.dueDate)}` : ""}</small></div><p class="${entry.type === "lent" || entry.type === "received" ? "amount-receive" : "amount-pay"}">${money(entry.amount)}</p></div>`; }).join("");
  if (!elements.personDialog.open) elements.personDialog.showModal();
}

function backupObject() { return { app: "Udhaari", version: 2, exportedAt: new Date().toISOString(), currency: "INR", entries: state.entries }; }

function saveFile(content, filename, mimeType, shareTitle) {
  if (window.AndroidBackup?.shareText) { window.AndroidBackup.shareText(filename, mimeType, content, shareTitle); showToast("Opening share options…"); return; }
  const blob = new Blob([content], { type: mimeType });
  if (navigator.share && typeof File !== "undefined") {
    const file = new File([blob], filename, { type: mimeType });
    navigator.share({ title: shareTitle, files: [file] }).catch((error) => { if (error.name !== "AbortError") downloadBlob(blob, filename); });
  } else downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 500); showToast("File saved"); }
function exportBackup() { saveFile(JSON.stringify(backupObject(), null, 2), `udhaari-backup-${today()}.json`, "application/json", "Udhaari backup"); }
function exportCsv() { saveFile(`\ufeff${Core.toCsv(state.entries)}`, `udhaari-history-${today()}.csv`, "text/csv", "Udhaari history"); }

async function importBackup(file) {
  elements.importMessage.textContent = "";
  try {
    const parsed = JSON.parse(await file.text()); const rawEntries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(rawEntries) || !rawEntries.every(Core.isValidEntry)) throw new Error("Invalid backup");
    const entries = Core.normalizeEntries(rawEntries);
    if (!window.confirm(`Restore ${entries.length} transactions? This will replace the ledger currently on this device.`)) return;
    state.entries = entries; saveEntries(); render(); elements.importMessage.textContent = `${entries.length} transactions restored successfully.`;
  } catch { elements.importMessage.textContent = "That file is not a valid Udhaari backup."; }
  finally { elements.importInput.value = ""; }
}

let toastTimer;
function showToast(message) { clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add("show"); toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2300); }

["#addEntryButton", "#emptyAddButton", "#mobileAddButton"].forEach((selector) => $(selector).addEventListener("click", () => openEntryDialog()));
$("#closeEntryDialog").addEventListener("click", () => closeDialog(elements.entryDialog));
$("#cancelEntryButton").addEventListener("click", () => closeDialog(elements.entryDialog));
elements.entryForm.addEventListener("submit", handleEntrySubmit);
elements.entryForm.addEventListener("change", (event) => { if (event.target.name === "type") updateDueDateVisibility(); });
elements.entryDate.addEventListener("change", () => { elements.dueDate.min = elements.entryDate.value; });
elements.peopleSearch.addEventListener("input", (event) => { state.peopleSearch = event.target.value; renderPeople(); });
elements.peopleFilters.addEventListener("click", (event) => { const button = event.target.closest("[data-people-filter]"); if (!button) return; state.peopleFilter = button.dataset.peopleFilter; elements.peopleFilters.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button)); renderPeople(); });
elements.historyFilter.addEventListener("change", (event) => { state.historyFilter = event.target.value; renderHistory(); });
elements.historySearch.addEventListener("input", (event) => { state.historySearch = event.target.value; renderHistory(); });
elements.peopleGrid.addEventListener("click", (event) => { const card = event.target.closest("[data-person]"); if (card) openPersonLedger(card.dataset.person); });
elements.peopleGrid.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key) && event.target.matches("[data-person]")) { event.preventDefault(); openPersonLedger(event.target.dataset.person); } });
elements.historyList.addEventListener("click", (event) => { const edit = event.target.closest("[data-edit]"); const remove = event.target.closest("[data-delete]"); if (edit) openEntryDialog(state.entries.find((entry) => entry.id === edit.dataset.edit)); if (remove) deleteEntry(remove.dataset.delete); });
elements.personQuickActions.addEventListener("click", (event) => { const settle = event.target.closest("[data-settle]"); const add = event.target.closest("[data-new-for-person]"); if (settle) openEntryDialog(null, { person: settle.dataset.personName, amount: settle.dataset.balance, type: settle.dataset.settle, note: "Repayment" }); if (add) openEntryDialog(null, { person: add.dataset.newForPerson }); });
$("#closePersonDialog").addEventListener("click", () => closeDialog(elements.personDialog));
["#backupButton", "#footerBackupButton"].forEach((selector) => $(selector).addEventListener("click", () => { elements.backupStats.textContent = `${state.entries.length} ${state.entries.length === 1 ? "transaction" : "transactions"} currently saved`; elements.importMessage.textContent = ""; elements.backupDialog.showModal(); }));
$("#closeBackupDialog").addEventListener("click", () => closeDialog(elements.backupDialog));
$("#exportButton").addEventListener("click", exportBackup); $("#csvButton").addEventListener("click", exportCsv);
elements.importInput.addEventListener("change", (event) => event.target.files[0] && importBackup(event.target.files[0]));
[elements.entryDialog, elements.personDialog, elements.backupDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog); }));

render();
