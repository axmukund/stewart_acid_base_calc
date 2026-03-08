"use strict";

const EXTRA_ION_CATION_COLORS = [
  "#2563EB",
  "#0891B2",
  "#0F766E",
  "#4F46E5",
  "#7C3AED",
];

const EXTRA_ION_ANION_COLORS = [
  "#EA580C",
  "#DC2626",
  "#D97706",
  "#DB2777",
  "#C2410C",
];

let _extraIonSeq = 0;

function additionalIonLabel(kind, index) {
  return (kind === "cation" ? "Extra cation " : "Extra anion ") + index;
}

function hashAdditionalIonKey(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function additionalIonColor(kind, key) {
  const palette = kind === "cation"
    ? EXTRA_ION_CATION_COLORS
    : EXTRA_ION_ANION_COLORS;
  return palette[hashAdditionalIonKey(key) % palette.length];
}

function updateAdditionalIonEmptyState() {
  const empty = el("additional-ions-empty");
  const list = el("additional-ions-list");
  if (!empty || !list) return;
  empty.style.display = list.children.length ? "none" : "block";
}

function wireAdditionalIonRow(row) {
  if (!row) return;

  const removeBtn = row.querySelector(".additional-ion-remove");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      row.remove();
      updateAdditionalIonEmptyState();
      computeAll();
    });
  }

  row.querySelectorAll("input, select").forEach((node) => {
    const evt = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(evt, computeAll);
  });
}

function makeAdditionalIonRow(definition) {
  const row = document.createElement("div");
  row.className = "additional-ion-row";
  row.dataset.ionId = definition.id;

  row.innerHTML =
    '<div class="additional-ion-grid">' +
      '<label class="additional-ion-field">' +
        "<span>Name</span>" +
        '<input type="text" class="additional-ion-name" maxlength="32" placeholder="e.g. sulfate">' +
      "</label>" +
      '<label class="additional-ion-field">' +
        "<span>Type</span>" +
        '<select class="additional-ion-kind">' +
          '<option value="anion">Anion</option>' +
          '<option value="cation">Cation</option>' +
        "</select>" +
      "</label>" +
      '<label class="additional-ion-field">' +
        "<span>Charge</span>" +
        '<select class="additional-ion-charge">' +
          '<option value="1">1</option>' +
          '<option value="2">2</option>' +
          '<option value="3">3</option>' +
        "</select>" +
      "</label>" +
      '<label class="additional-ion-field">' +
        "<span>Concentration (mmol/L)</span>" +
        '<input type="number" min="0" step="0.1" class="additional-ion-value" placeholder="0.0">' +
      "</label>" +
    "</div>" +
    '<button type="button" class="btn additional-ion-remove">Remove</button>';

  const nameEl = row.querySelector(".additional-ion-name");
  const kindEl = row.querySelector(".additional-ion-kind");
  const chargeEl = row.querySelector(".additional-ion-charge");
  const valueEl = row.querySelector(".additional-ion-value");

  if (kindEl) kindEl.value = definition.kind || "anion";
  if (chargeEl) chargeEl.value = String(definition.charge || 1);
  if (nameEl) nameEl.value = definition.name || additionalIonLabel(kindEl ? kindEl.value : "anion", definition.index);
  if (valueEl && Number.isFinite(definition.value)) valueEl.value = String(definition.value);

  return row;
}

function addAdditionalIon(definition = {}) {
  const list = el("additional-ions-list");
  if (!list) return null;

  _extraIonSeq += 1;
  const row = makeAdditionalIonRow({
    id: definition.id || ("extra-ion-" + _extraIonSeq),
    index: definition.index || _extraIonSeq,
    kind: definition.kind || "anion",
    charge: definition.charge || 1,
    name: definition.name || "",
    value: definition.value,
  });

  list.appendChild(row);
  wireAdditionalIonRow(row);
  updateAdditionalIonEmptyState();
  computeAll();
  return row;
}

function clearAdditionalIons() {
  const list = el("additional-ions-list");
  if (!list) return;
  list.innerHTML = "";
  _extraIonSeq = 0;
  updateAdditionalIonEmptyState();
}

function getAdditionalIonSegments() {
  const rows = Array.from(document.querySelectorAll(".additional-ion-row"));
  const cations = [];
  const anions = [];

  rows.forEach((row, index) => {
    const kindEl = row.querySelector(".additional-ion-kind");
    const chargeEl = row.querySelector(".additional-ion-charge");
    const valueEl = row.querySelector(".additional-ion-value");
    const nameEl = row.querySelector(".additional-ion-name");

    const kind = kindEl ? kindEl.value : "anion";
    const charge = Math.max(1, parseInt(chargeEl ? chargeEl.value : "1", 10) || 1);
    const concentration = parseFloat(valueEl ? valueEl.value : "");
    if (!Number.isFinite(concentration) || concentration <= 0) return;

    const displayName = (nameEl && nameEl.value.trim())
      ? nameEl.value.trim()
      : additionalIonLabel(kind, index + 1);
    const key = row.dataset.ionId || ("extra-ion-" + (index + 1));
    const segment = {
      k: key,
      labelText: displayName,
      v: concentration * charge,
      concentration,
      charge,
      kind,
      c: additionalIonColor(kind, key),
      isCustom: true,
    };

    if (kind === "cation") cations.push(segment);
    else anions.push(segment);
  });

  return {
    cations,
    anions,
    totalCations: cations.reduce((sum, item) => sum + item.v, 0),
    totalAnions: anions.reduce((sum, item) => sum + item.v, 0),
  };
}

const _addIonBtn = el("add-ion");
if (_addIonBtn) {
  _addIonBtn.addEventListener("click", () => addAdditionalIon());
}

updateAdditionalIonEmptyState();
