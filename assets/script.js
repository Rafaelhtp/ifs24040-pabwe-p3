/**
 * PABWE Praktikum 3 - LifeDash
 * Fitur: Expense Tracker, Bookmark Manager, Quiz App
 *
 * Catatan arsitektur:
 * - Routing tab memakai query URL (?tab=expense|bookmark|quiz) via URLSearchParams + History API.
 * - Tidak ada atribut inline (onclick dll). Semua event memakai addEventListener / event delegation.
 * - Konfirmasi hapus memakai modal (bukan window.confirm).
 * - Validasi form dilakukan di JavaScript (selain atribut HTML).
 */

/* ==========================================
   UTILITAS
========================================== */
function $(selector) { return document.querySelector(selector); }
function $all(selector) { return document.querySelectorAll(selector); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// Mencegah XSS saat data pengguna dirender lewat innerHTML
function escapeHtml(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (ch) => map[ch]);
}

// Membaca array dari localStorage dengan aman (tidak crash jika data rusak)
function loadList(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* ==========================================
   PESAN ERROR INLINE (pengganti alert)
========================================== */
function showError(selector, message) {
  const el = $(selector);
  el.textContent = message;
  el.classList.remove("hidden");
}
function clearError(selector) {
  const el = $(selector);
  el.textContent = "";
  el.classList.add("hidden");
}

/* ==========================================
   VALIDASI
========================================== */
const MAX_AMOUNT = 1_000_000_000_000; // 1 triliun rupiah

function validateAmount(raw) {
  const text = String(raw).trim();
  if (text === "") return { error: "Jumlah wajib diisi." };
  if (!/^\d+$/.test(text)) return { error: "Jumlah harus berupa bilangan bulat positif (tanpa huruf, titik, atau minus)." };
  const value = Number(text);
  if (value < 1) return { error: "Jumlah harus lebih dari 0." };
  if (value > MAX_AMOUNT) return { error: `Jumlah maksimal Rp ${MAX_AMOUNT.toLocaleString("id-ID")}.` };
  return { value };
}

function validateUrl(raw) {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) return { error: "URL tidak valid. Harus diawali http:// atau https://" };
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) throw new Error("invalid");
    return { value: text };
  } catch {
    return { error: "Format URL tidak valid." };
  }
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// Format wajib YYYY-MM-DD, harus tanggal nyata di kalender, dan tahun dalam rentang wajar
function validateDate(raw) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return { error: "Tanggal transaksi harus berformat YYYY-MM-DD." };

  const [year, month, day] = match.slice(1).map(Number);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return { error: `Tahun transaksi harus antara ${MIN_YEAR} dan ${MAX_YEAR}.` };
  }

  const parsed = new Date(year, month - 1, day);
  const isRealDate = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  if (!isRealDate) return { error: "Tanggal transaksi tidak ada di kalender." };

  return { value: raw };
}

// prefix: "exp-" untuk form tambah, "edit-exp-" untuk form ubah
function readExpenseForm(prefix) {
  const title = $(`#${prefix}title`).value.trim();
  const type = $(`#${prefix}type`).value;
  const category = $(`#${prefix}category`).value.trim();

  if (!title) return { error: "Nama transaksi tidak boleh kosong." };
  if (!["Pemasukan", "Pengeluaran"].includes(type)) return { error: "Tipe transaksi tidak valid." };
  if (!category) return { error: "Kategori tidak boleh kosong." };

  const amount = validateAmount($(`#${prefix}amount`).value);
  if (amount.error) return { error: amount.error };

  const date = validateDate($(`#${prefix}date`).value);
  if (date.error) return { error: date.error };

  return { data: { title, type, category, amount: amount.value, date: date.value } };
}

// prefix: "bm-" untuk form tambah, "edit-bm-" untuk form ubah
function readBookmarkForm(prefix) {
  const title = $(`#${prefix}title`).value.trim();
  const category = $(`#${prefix}category`).value.trim();
  const note = $(`#${prefix}note`).value.trim(); // opsional

  if (!title) return { error: "Judul tautan tidak boleh kosong." };
  if (!category) return { error: "Kategori tidak boleh kosong." };
  if (note.length > 200) return { error: "Catatan maksimal 200 karakter." };

  const url = validateUrl($(`#${prefix}url`).value);
  if (url.error) return { error: url.error };

  return { data: { title, url: url.value, category, note } };
}

/* ==========================================
   MODAL (edit + konfirmasi hapus)
========================================== */
const MODAL_IDS = ["#modal-exp-edit", "#modal-bm-edit", "#modal-confirm"];
let pendingDelete = null; // { type: "expense" | "bookmark", id }

function openModal(modalId) {
  const m = $(modalId);
  m.classList.remove("hidden");
  m.classList.add("flex");
  const focusable = m.querySelector("input:not([type=hidden]), select, button");
  if (focusable) focusable.focus();
}

function closeModal(modalId) {
  const m = $(modalId);
  m.classList.add("hidden");
  m.classList.remove("flex");
}

function closeAllModals() {
  MODAL_IDS.forEach(closeModal);
  clearError("#edit-exp-error");
  clearError("#edit-bm-error");
  pendingDelete = null;
}

$all(".btn-close-modal, .modal-backdrop").forEach((el) => {
  el.addEventListener("click", closeAllModals);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllModals();
});

// Setiap form: reset ATAU mengetik ulang akan membersihkan pesan error-nya
[
  ["#form-expense", "#exp-error"],
  ["#form-bookmark", "#bm-error"],
  ["#form-exp-edit", "#edit-exp-error"],
  ["#form-bm-edit", "#edit-bm-error"]
].forEach(([formSelector, errorSelector]) => {
  const form = $(formSelector);
  form.addEventListener("reset", () => clearError(errorSelector));
  form.addEventListener("input", () => clearError(errorSelector));
});

function askDelete(type, id) {
  pendingDelete = { type, id };
  $("#confirm-message").textContent =
    type === "expense" ? "Hapus catatan ini secara permanen?" : "Hapus tautan ini?";
  openModal("#modal-confirm");
}

$("#btn-confirm-delete").addEventListener("click", () => {
  if (!pendingDelete) return;
  const { type, id } = pendingDelete;

  if (type === "expense") {
    expenses = expenses.filter((e) => e.id !== id);
    saveExp();
    renderExp();
  } else if (type === "bookmark") {
    bookmarks = bookmarks.filter((b) => b.id !== id);
    saveBm();
    renderBm();
  }
  closeAllModals();
});

/* ==========================================
   SISTEM TAB NAVIGATION (ROUTING QUERY URL)
   Format: ?tab=expense | ?tab=bookmark | ?tab=quiz
========================================== */
const VALID_TABS = ["expense", "bookmark", "quiz"];
const DEFAULT_TAB = "expense";
const tabs = $all(".tab-btn"); // satu-satunya pemilihan .tab-btn (dipakai ulang di bawah)

// Class dasar tab ada di index.html; JS hanya men-toggle class untuk state aktif/nonaktif
const TAB_CLASSES = {
  inactive: ["text-stone-800", "hover:bg-stone-200"],
  active: ["text-[#F4F0EB]"],
  activeBg: { expense: "bg-stone-800", bookmark: "bg-stone-800", quiz: "bg-[#9A161F]" }
};

const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz")
};

// Ambil nilai ?tab= dari URL; null jika tidak ada / tidak valid
function getTabFromURL() {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return VALID_TABS.includes(tab) ? tab : null;
}

function buildTabURL(tabId) {
  const params = new URLSearchParams(window.location.search);
  params.set("tab", tabId);
  return `${window.location.pathname}?${params.toString()}`;
}

function renderActiveTab(tabId) {
  if (!panels[tabId]) tabId = DEFAULT_TAB;

  Object.values(panels).forEach((p) => p.classList.add("hidden"));

  panels[tabId].classList.remove("hidden");

  tabs.forEach((t) => {
    const isActive = t.dataset.tab === tabId;
    TAB_CLASSES.inactive.forEach((c) => t.classList.toggle(c, !isActive));
    TAB_CLASSES.active.forEach((c) => t.classList.toggle(c, isActive));
    t.classList.toggle(TAB_CLASSES.activeBg[t.dataset.tab], isActive);
    if (isActive) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
}

// Pindah tab: perbarui URL (?tab=...) lalu render panel
function navigateToTab(tabId, { replace = false } = {}) {
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ tab: tabId }, "", buildTabURL(tabId));
  renderActiveTab(tabId);
}

// Klik menu tab: cegah reload, gunakan History API
tabs.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const tabId = link.dataset.tab;
    if (tabId !== getTabFromURL()) navigateToTab(tabId);
  });
});

// Tombol Back/Forward browser
window.addEventListener("popstate", () => {
  renderActiveTab(getTabFromURL() || DEFAULT_TAB);
});

// Saat pertama dimuat: pakai ?tab= jika valid, jika tidak arahkan ke tab default
const initialTab = getTabFromURL();
if (initialTab) {
  renderActiveTab(initialTab);
} else {
  navigateToTab(DEFAULT_TAB, { replace: true });
}

/* ==========================================
   FITUR 1: EXPENSE TRACKER
========================================== */
const EXP_KEY = "pabwe_expenses";
let expenses = loadList(EXP_KEY);

const expForm = $("#form-expense");
const expList = $("#exp-list");
const expEmpty = $("#exp-empty");
const expSearch = $("#exp-search");
const expFilter = $("#exp-filter-type");
const expSort = $("#exp-sort");

function saveExp() {
  localStorage.setItem(EXP_KEY, JSON.stringify(expenses));
}

function renderExp() {
  const keyword = expSearch.value.toLowerCase();
  let filtered = expenses.filter((e) =>
    e.title.toLowerCase().includes(keyword) ||
    e.category.toLowerCase().includes(keyword)
  );

  if (expFilter.value !== "All") {
    filtered = filtered.filter((e) => e.type === expFilter.value);
  }

  filtered.sort((a, b) => {
    if (expSort.value === "newest") return new Date(b.date) - new Date(a.date);
    if (expSort.value === "oldest") return new Date(a.date) - new Date(b.date);
    if (expSort.value === "highest") return b.amount - a.amount;
    if (expSort.value === "lowest") return a.amount - b.amount;
    return 0;
  });

  let totalIn = 0, totalOut = 0;
  expenses.forEach((e) => {
    if (e.type === "Pemasukan") totalIn += e.amount;
    else totalOut += e.amount;
  });

  $("#exp-total-in").textContent = `Rp ${totalIn.toLocaleString("id-ID")}`;
  $("#exp-total-out").textContent = `Rp ${totalOut.toLocaleString("id-ID")}`;
  $("#exp-balance").textContent = `Rp ${(totalIn - totalOut).toLocaleString("id-ID")}`;

  expList.innerHTML = "";
  if (filtered.length === 0) {
    expEmpty.classList.remove("hidden");
    return;
  }

  expEmpty.classList.add("hidden");
  filtered.forEach((e) => {
    const li = document.createElement("li");
    li.className = "flex justify-between items-center bg-[#FAFAF7] border-2 border-stone-800 p-4 shadow-[4px_4px_0_0_#292524]";

    const isIncome = e.type === "Pemasukan";
    const catStyle = isIncome ? "bg-stone-800 text-white" : "bg-[#9A161F] text-white";
    const amountColor = isIncome ? "text-stone-800" : "text-[#9A161F]";
    const sign = isIncome ? "+" : "-";

    // Tombol memakai data-action / data-id (tanpa onclick inline)
    li.innerHTML = `
      <div>
        <p class="font-bold font-display text-lg text-stone-900">${escapeHtml(e.title)} <span class="text-[10px] uppercase tracking-widest font-sans px-2 py-1 ml-2 ${catStyle}">${escapeHtml(e.category)}</span></p>
        <p class="text-sm text-stone-500 font-serif italic mt-1"><i class="ti ti-calendar" aria-hidden="true"></i> ${escapeHtml(e.date)}</p>
      </div>
      <div class="text-right">
        <p class="text-xl font-bold font-display ${amountColor}">${sign} Rp ${e.amount.toLocaleString("id-ID")}</p>
        <div class="mt-2 flex gap-3 justify-end font-bold text-sm tracking-widest uppercase">
          <button type="button" class="text-stone-600 hover:text-stone-900 hover:underline" data-action="edit" data-id="${escapeHtml(e.id)}">Ubah</button>
          <button type="button" class="text-[#9A161F] hover:text-red-900 hover:underline" data-action="delete" data-id="${escapeHtml(e.id)}">Hapus</button>
        </div>
      </div>
    `;
    expList.appendChild(li);
  });
}

// Event delegation untuk tombol Ubah / Hapus pada daftar transaksi
expList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "edit") openExpEdit(id);
  if (action === "delete") askDelete("expense", id);
});

expForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = readExpenseForm("exp-");
  if (result.error) return showError("#exp-error", result.error);

  clearError("#exp-error");
  expenses.push({ id: generateId(), ...result.data });
  saveExp();
  renderExp();
  expForm.reset();
});

function openExpEdit(id) {
  const exp = expenses.find((e) => e.id === id);
  if (!exp) return;
  clearError("#edit-exp-error");
  $("#edit-exp-id").value = exp.id;
  $("#edit-exp-title").value = exp.title;
  $("#edit-exp-type").value = exp.type;
  $("#edit-exp-category").value = exp.category;
  $("#edit-exp-amount").value = exp.amount;
  $("#edit-exp-date").value = exp.date;
  openModal("#modal-exp-edit");
}

$("#form-exp-edit").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#edit-exp-id").value;
  const index = expenses.findIndex((item) => item.id === id);
  if (index === -1) return;

  const result = readExpenseForm("edit-exp-");
  if (result.error) return showError("#edit-exp-error", result.error);

  expenses[index] = { id, ...result.data };
  saveExp();
  renderExp();
  closeAllModals();
});

expSearch.addEventListener("input", renderExp);
expFilter.addEventListener("change", renderExp);
expSort.addEventListener("change", renderExp);

renderExp();


/* ==========================================
   FITUR 2: BOOKMARK MANAGER
========================================== */
const BM_KEY = "pabwe_bookmarks";
let bookmarks = loadList(BM_KEY);

const bmForm = $("#form-bookmark");
const bmList = $("#bm-list");
const bmSearch = $("#bm-search");
const bmSort = $("#bm-sort");

function saveBm() { localStorage.setItem(BM_KEY, JSON.stringify(bookmarks)); }

function renderBm() {
  const keyword = bmSearch.value.toLowerCase();
  let filtered = bookmarks.filter((b) =>
    b.title.toLowerCase().includes(keyword) ||
    b.category.toLowerCase().includes(keyword) ||
    b.url.toLowerCase().includes(keyword)
  );

  filtered.sort((a, b) => {
    if (bmSort.value === "newest") return b.timestamp - a.timestamp;
    if (bmSort.value === "asc") return a.title.localeCompare(b.title);
    if (bmSort.value === "desc") return b.title.localeCompare(a.title);
    return 0;
  });

  bmList.innerHTML = "";
  if (filtered.length === 0) {
    $("#bm-empty").classList.remove("hidden");
    return;
  }

  $("#bm-empty").classList.add("hidden");
  filtered.forEach((b) => {
    const li = document.createElement("li");
    li.className = "bg-[#FAFAF7] border-2 border-stone-800 p-5 flex flex-col justify-between shadow-[4px_4px_0_0_#292524]";
    li.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-3">
          <h3 class="font-bold font-display text-xl text-stone-900 line-clamp-1">${escapeHtml(b.title)}</h3>
          <span class="text-[10px] border border-stone-800 bg-transparent text-stone-800 px-2 py-1 uppercase tracking-widest font-bold">${escapeHtml(b.category)}</span>
        </div>
        <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer" class="text-sm font-serif italic text-[#9A161F] hover:bg-[#9A161F] hover:text-white transition break-all block ${b.note ? "mb-3" : "mb-6"} p-1"><i class="ti ti-external-link" aria-hidden="true"></i> ${escapeHtml(b.url)}</a>
        ${b.note ? `<p class="text-sm font-serif text-stone-700 break-words mb-6 p-1">${escapeHtml(b.note)}</p>` : ""}
      </div>
      <div class="flex gap-0 border-t-2 border-stone-800 mt-auto pt-4">
        <button type="button" class="flex-1 bg-transparent text-stone-800 py-2 text-sm font-bold uppercase tracking-widest hover:bg-stone-200 border-r-2 border-stone-800" data-action="edit" data-id="${escapeHtml(b.id)}">Ubah</button>
        <button type="button" class="flex-1 bg-transparent text-[#9A161F] py-2 text-sm font-bold uppercase tracking-widest hover:bg-red-100" data-action="delete" data-id="${escapeHtml(b.id)}">Hapus</button>
      </div>
    `;
    bmList.appendChild(li);
  });
}

// Event delegation untuk tombol Ubah / Hapus pada daftar bookmark
bmList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "edit") openBmEdit(id);
  if (action === "delete") askDelete("bookmark", id);
});

bmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = readBookmarkForm("bm-");
  if (result.error) return showError("#bm-error", result.error);

  clearError("#bm-error");
  bookmarks.push({ id: generateId(), ...result.data, timestamp: Date.now() });
  saveBm();
  renderBm();
  bmForm.reset();
});

function openBmEdit(id) {
  const bm = bookmarks.find((b) => b.id === id);
  if (!bm) return;
  clearError("#edit-bm-error");
  $("#edit-bm-id").value = bm.id;
  $("#edit-bm-title").value = bm.title;
  $("#edit-bm-url").value = bm.url;
  $("#edit-bm-category").value = bm.category;
  $("#edit-bm-note").value = bm.note || "";
  openModal("#modal-bm-edit");
}

$("#form-bm-edit").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#edit-bm-id").value;
  const index = bookmarks.findIndex((b) => b.id === id);
  if (index === -1) return;

  const result = readBookmarkForm("edit-bm-");
  if (result.error) return showError("#edit-bm-error", result.error);

  bookmarks[index] = { ...bookmarks[index], ...result.data };
  saveBm();
  renderBm();
  closeAllModals();
});

bmSearch.addEventListener("input", renderBm);
bmSort.addEventListener("change", renderBm);

renderBm();


/* ==========================================
   FITUR 3: KUIS INTERAKTIF
========================================== */
const QUIZ_KEY = "pabwe_quiz_highscore";
let quizHighScore = Number(localStorage.getItem(QUIZ_KEY)) || 0;
$("#quiz-highscore").textContent = quizHighScore;

const quizQuestions = [
  { q: "HTML adalah kependekan dari?", options: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks Text Mark Language", "Hyper Tool Multi Language"], ans: 0 },
  { q: "Tag HTML yang digunakan untuk membubuhi tautan/link adalah?", options: ["<link>", "<a>", "<href>", "<url>"], ans: 1 },
  { q: "Properti CSS apa yang mengubah warna teks?", options: ["font-color", "text-color", "color", "bgcolor"], ans: 2 },
  { q: "Di manakah tempat yang direkomendasikan memanggil eksternal script JS?", options: ["Di dalam <head>", "Di akhir <body>", "Di awal <body>", "Dalam file JSON"], ans: 1 },
  { q: "Tanda baca pembuka untuk sebuah struktur Data Array di Javascript adalah?", options: ["( )", "{ }", "< >", "[ ]"], ans: 3 }
];

let currQIndex = 0;
let quizScore = 0;
let timer;
let timeLeft = 15;

const scrStart = $("#quiz-start-screen");
const scrQuest = $("#quiz-question-screen");
const scrResult = $("#quiz-result-screen");

function startQuiz() {
  currQIndex = 0;
  quizScore = 0;
  scrStart.classList.add("hidden");
  scrResult.classList.add("hidden");
  scrQuest.classList.remove("hidden");
  renderQuestion();
}

function renderQuestion() {
  clearInterval(timer);
  timeLeft = 15;
  $("#quiz-timer").textContent = timeLeft;

  const q = quizQuestions[currQIndex];
  $("#quiz-current-num").textContent = currQIndex + 1;
  $("#quiz-question").textContent = q.q;

  const optContainer = $("#quiz-options");
  optContainer.innerHTML = "";

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "text-left w-full border-2 border-stone-800 bg-[#FAFAF7] p-5 font-bold font-serif text-lg text-stone-800 hover:bg-stone-200 transition shadow-[4px_4px_0_0_#292524]";
    btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
    btn.addEventListener("click", () => handleAnswer(idx));
    optContainer.appendChild(btn);
  });

  timer = setInterval(() => {
    timeLeft--;
    $("#quiz-timer").textContent = timeLeft;
    if (timeLeft <= 0) {
      handleAnswer(-1); // Waktu habis (dihitung salah)
    }
  }, 1000);
}

function handleAnswer(selectedIndex) {
  clearInterval(timer);
  const correctIndex = quizQuestions[currQIndex].ans;

  if (selectedIndex === correctIndex) quizScore++;

  const btns = $("#quiz-options").children;
  for (let i = 0; i < btns.length; i++) {
    btns[i].disabled = true;
    btns[i].classList.remove("hover:bg-stone-200");

    if (i === correctIndex) {
      btns[i].classList.add("bg-stone-800", "text-[#F4F0EB]"); // Benar: blok hitam
    } else if (i === selectedIndex) {
      btns[i].classList.add("bg-[#9A161F]", "text-[#F4F0EB]", "border-[#9A161F]"); // Salah: blok merah
    } else {
      btns[i].classList.add("opacity-50");
    }
  }

  setTimeout(() => {
    currQIndex++;
    if (currQIndex < quizQuestions.length) {
      renderQuestion();
    } else {
      endQuiz();
    }
  }, 1200);
}

function endQuiz() {
  scrQuest.classList.add("hidden");
  scrResult.classList.remove("hidden");

  $("#quiz-final-score").textContent = quizScore;

  if (quizScore > quizHighScore) {
    quizHighScore = quizScore;
    localStorage.setItem(QUIZ_KEY, quizHighScore);
    $("#quiz-highscore").textContent = quizHighScore;
    $("#quiz-new-record").classList.remove("hidden");
  } else {
    $("#quiz-new-record").classList.add("hidden");
  }
}

$("#btn-start-quiz").addEventListener("click", startQuiz);
$("#btn-restart-quiz").addEventListener("click", startQuiz);