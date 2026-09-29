"use strict";

const STORAGE_KEY = "udhaari-ledger-v1";

const state = {
  entries: loadEntries(),
  peopleSearch: "",
  historyFilter: "all",
};

const elements = {
  netBalance: document.querySelector("#netBalance"),
  netCaption: document.querySelector("#netCaption"),
  totalReceive: document.querySelector("#totalReceive"),
  receiveCaption: document.querySelector("#receiveCaption"),
  totalPay: document.querySelector("#totalPay"),
  payCaption: document.querySelector("#payCaption"),
  balanceTrack: document.querySelector("#balanceTrack"),
  peopleGrid: document.querySelector("#peopleGrid"),
  peopleEmpty: document.querySelector("#peopleEmpty"),
  peopleSearch: document.querySelector("#peopleSearch"),
  historyList: document.querySelector("#historyList"),
  historyEmpty: document.querySelector("#historyEmpty"),
  historyFilter: document.querySelector("#historyFilter"),
  clearSettledButton: document.querySelector("#clearSettledButton"),
  entryDialog: document.querySelector("#entryDialog"),
  entryForm: document.querySelector("#entryForm"),
  entryId: document.querySelector("#entryId"),
  dialogEyebrow: document.querySelector("#dialogEyebrow"),
  dialogTitle: document.querySelector("#dialogTitle"),
  personName: document.querySelector("#personName"),
  amount: document.querySelector("#amount"),
  entryDate: document.querySelector("#entryDate"),
  note: document.querySelector("#note"),
  personDialog: document.querySelector("#personDialog"),
  personDialogTitle: document.querySelector("#personDialogTitle"),
  personDialogSummary: document.querySelector("#personDialogSummary"),
  personDialogHistory: document.querySelector("#personDialogHistory"),
  backupDialog: document.querySelector("#backupDialog"),
  importInput: document.querySelector("#importInput"),
  importMessage: document.querySelector("#importMessage"),
  toast: document.querySelector("#toast"),
};

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function isValidEntry(entry) {
  return entry && typeof entry.id === "string" && typeof entry.person === "string" &&
    ["receive", "pay"].includes(entry.direction) && Number.isFinite(Number(entry.amount)) &&
    Number(entry.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(entry.date);
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function money(value, includeSign = false) {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(Math.abs(value));
  if (!includeSign || value === 0) return formatted;
  return `${value > 0 ? "+" : "−"}${formatted}`;
}

function displayDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(year, month - 1, day));
}

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function getPeople() {
  const map = new Map();
  state.entries.forEach((entry) => {
    const key = entry.person.trim().toLocaleLowerCase();
    if (!map.has(key)) map.set(key, { name: entry.person.trim(), balance: 0, count: 0 });
    const person = map.get(key);
    person.balance += entry.direction === "receive" ? Number(entry.amount) : -Number(entry.amount);
    person.count += 1;
  });
  return [...map.values()].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function render() {
  renderSummary();
  renderPeople();
  renderHistory();
}

function renderSummary() {
  const people = getPeople();
  const receivePeople = people.filter((person) => person.balance > 0);
  const payPeople = people.filter((person) => person.balance < 0);
  const receive = receivePeople.reduce((sum, person) => sum + person.balance, 0);
  const pay = payPeople.reduce((sum, person) => sum + Math.abs(person.balance), 0);
  const net = receive - pay;
  const totalMovement = receive + pay;

  elements.netBalance.textContent = money(net, true);
  elements.netCaption.textContent = net > 0 ? "Overall, you will receive" : net < 0 ? "Overall, you need to pay" : "You are all settled up";
  elements.totalReceive.textContent = money(receive);
  elements.receiveCaption.textContent = `Across ${receivePeople.length} ${receivePeople.length === 1 ? "person" : "people"}`;
  elements.totalPay.textContent = money(pay);
  elements.payCaption.textContent = `Across ${payPeople.length} ${payPeople.length === 1 ? "person" : "people"}`;
  elements.balanceTrack.style.width = totalMovement ? `${Math.max(5, Math.min(95, receive / totalMovement * 100))}%` : "50%";
}

function renderPeople() {
  const query = state.peopleSearch.trim().toLocaleLowerCase();
  const people = getPeople().filter((person) => person.name.toLocaleLowerCase().includes(query));
  elements.peopleGrid.innerHTML = people.map((person) => {
    const kind = person.balance > 0 ? "receive" : person.balance < 0 ? "pay" : "settled";
    const label = kind === "receive" ? "You'll receive" : kind === "pay" ? "You need to pay" : "Settled up";
    return `
      <article class="person-card" tabindex="0" role="button" data-person="${escapeHtml(person.name)}" aria-label="Open ${escapeHtml(person.name)}'s ledger">
        <div class="avatar">${escapeHtml(person.name.charAt(0).toUpperCase())}</div>
        <div class="person-info">
          <p class="person-name">${escapeHtml(person.name)}</p>
          <p class="person-detail">${label} · ${person.count} ${person.count === 1 ? "entry" : "entries"}</p>
        </div>
        <p class="person-amount amount-${kind}">${money(person.balance, true)}</p>
      </article>`;
  }).join("");
  elements.peopleEmpty.classList.toggle("show", people.length === 0);
  elements.peopleGrid.style.display = people.length ? "grid" : "none";
}

function renderHistory() {
  const entries = [...state.entries]
    .filter((entry) => state.historyFilter === "all" || entry.direction === state.historyFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));

  elements.historyList.innerHTML = entries.map((entry) => {
    const receive = entry.direction === "receive";
    return `
      <article class="history-item">
        <div class="history-icon ${receive ? "receive-icon" : "pay-icon"}" aria-hidden="true">${receive ? "↓" : "↑"}</div>
        <div>
          <p class="history-person">${escapeHtml(entry.person)}</p>
          <span class="history-date">${displayDate(entry.date)}</span>
        </div>
        <p class="history-note">${escapeHtml(entry.note || (receive ? "They owe you" : "You owe them"))}</p>
        <p class="history-amount ${receive ? "amount-receive" : "amount-pay"}">${receive ? "+" : "−"}${money(entry.amount)}</p>
        <div class="item-menu">
          <button class="item-action" type="button" data-edit="${entry.id}" aria-label="Edit entry" title="Edit">✎</button>
          <button class="item-action" type="button" data-delete="${entry.id}" aria-label="Delete entry" title="Delete">×</button>
        </div>
      </article>`;
  }).join("");
  elements.historyList.style.display = entries.length ? "block" : "none";
  elements.historyEmpty.classList.toggle("show", entries.length === 0);
}

function openEntryDialog(entry = null) {
  elements.entryForm.reset();
  elements.entryId.value = entry?.id || "";
  elements.dialogEyebrow.textContent = entry ? "UPDATE RECORD" : "NEW RECORD";
  elements.dialogTitle.textContent = entry ? "Edit entry" : "Add an entry";
  elements.personName.value = entry?.person || "";
  elements.amount.value = entry?.amount || "";
  elements.entryDate.value = entry?.date || today();
  elements.note.value = entry?.note || "";
  const direction = entry?.direction || "receive";
  elements.entryForm.querySelector(`[name="direction"][value="${direction}"]`).checked = true;
  elements.entryDialog.showModal();
  setTimeout(() => elements.personName.focus(), 50);
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function handleEntrySubmit(event) {
  event.preventDefault();
  const id = elements.entryId.value;
  const entry = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    person: elements.personName.value.trim().replace(/\s+/g, " "),
    direction: elements.entryForm.elements.direction.value,
    amount: Math.round(Number(elements.amount.value) * 100) / 100,
    date: elements.entryDate.value,
    note: elements.note.value.trim(),
    createdAt: id ? (state.entries.find((item) => item.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
  };

  if (!entry.person || !Number.isFinite(entry.amount) || entry.amount <= 0 || !entry.date) return;
  if (id) {
    state.entries = state.entries.map((item) => item.id === id ? entry : item);
  } else {
    state.entries.push(entry);
  }
  saveEntries();
  render();
  closeDialog(elements.entryDialog);
  showToast(id ? "Entry updated" : "Entry saved");
}

function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !window.confirm(`Delete the ${money(entry.amount)} entry for ${entry.person}?`)) return;
  state.entries = state.entries.filter((item) => item.id !== id);
  saveEntries();
  render();
  showToast("Entry deleted");
}

function openPersonLedger(name) {
  const entries = state.entries
    .filter((entry) => entry.person.toLocaleLowerCase() === name.toLocaleLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date));
  const balance = entries.reduce((sum, entry) => sum + (entry.direction === "receive" ? Number(entry.amount) : -Number(entry.amount)), 0);
  elements.personDialogTitle.textContent = name;
  elements.personDialogSummary.innerHTML = `<span>${balance > 0 ? "They owe you" : balance < 0 ? "You owe them" : "All settled"}</span><strong>${money(balance, true)}</strong>`;
  elements.personDialogHistory.innerHTML = entries.map((entry) => `
    <div class="person-ledger-row">
      <div><p>${escapeHtml(entry.note || (entry.direction === "receive" ? "They owe you" : "You owe them"))}</p><small>${displayDate(entry.date)}</small></div>
      <p class="${entry.direction === "receive" ? "amount-receive" : "amount-pay"}">${entry.direction === "receive" ? "+" : "−"}${money(entry.amount)}</p>
    </div>`).join("");
  elements.personDialog.showModal();
}

function clearSettled() {
  const settledKeys = getPeople().filter((person) => Math.abs(person.balance) < 0.001).map((person) => person.name.toLocaleLowerCase());
  if (!settledKeys.length) {
    showToast("No settled records to clear");
    return;
  }
  if (!window.confirm(`Remove all history for ${settledKeys.length} settled ${settledKeys.length === 1 ? "person" : "people"}? Download a backup first if you may need it later.`)) return;
  state.entries = state.entries.filter((entry) => !settledKeys.includes(entry.person.toLocaleLowerCase()));
  saveEntries();
  render();
  showToast("Settled records cleared");
}

function exportBackup() {
  const backup = { app: "Udhaari", version: 1, exportedAt: new Date().toISOString(), entries: state.entries };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `udhaari-backup-${today()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Backup downloaded");
}

async function importBackup(file) {
  elements.importMessage.textContent = "";
  try {
    const parsed = JSON.parse(await file.text());
    const entries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(entries) || !entries.every(isValidEntry)) throw new Error("Invalid backup");
    if (!window.confirm(`Restore ${entries.length} entries? This will replace the records currently in this browser.`)) return;
    state.entries = entries.map((entry) => ({ ...entry, amount: Number(entry.amount) }));
    saveEntries();
    render();
    elements.importMessage.textContent = `${entries.length} entries restored successfully.`;
  } catch {
    elements.importMessage.textContent = "That file is not a valid Udhaari backup.";
  } finally {
    elements.importInput.value = "";
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

document.querySelector("#addEntryButton").addEventListener("click", () => openEntryDialog());
document.querySelector("#emptyAddButton").addEventListener("click", () => openEntryDialog());
document.querySelector("#closeEntryDialog").addEventListener("click", () => closeDialog(elements.entryDialog));
document.querySelector("#cancelEntryButton").addEventListener("click", () => closeDialog(elements.entryDialog));
elements.entryForm.addEventListener("submit", handleEntrySubmit);

elements.peopleSearch.addEventListener("input", (event) => { state.peopleSearch = event.target.value; renderPeople(); });
elements.historyFilter.addEventListener("change", (event) => { state.historyFilter = event.target.value; renderHistory(); });
elements.clearSettledButton.addEventListener("click", clearSettled);

elements.peopleGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-person]");
  if (card) openPersonLedger(card.dataset.person);
});
elements.peopleGrid.addEventListener("keydown", (event) => {
  if (["Enter", " "].includes(event.key) && event.target.matches("[data-person]")) {
    event.preventDefault();
    openPersonLedger(event.target.dataset.person);
  }
});

elements.historyList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) openEntryDialog(state.entries.find((entry) => entry.id === editButton.dataset.edit));
  if (deleteButton) deleteEntry(deleteButton.dataset.delete);
});

document.querySelector("#closePersonDialog").addEventListener("click", () => closeDialog(elements.personDialog));
["#backupButton", "#footerBackupButton"].forEach((selector) => document.querySelector(selector).addEventListener("click", () => elements.backupDialog.showModal()));
document.querySelector("#closeBackupDialog").addEventListener("click", () => closeDialog(elements.backupDialog));
document.querySelector("#exportButton").addEventListener("click", exportBackup);
elements.importInput.addEventListener("change", (event) => event.target.files[0] && importBackup(event.target.files[0]));

[elements.entryDialog, elements.personDialog, elements.backupDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

render();
