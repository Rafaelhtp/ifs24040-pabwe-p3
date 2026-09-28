/**
 * PABWE Praktikum 3 - LifeDash - Pabwe P3
 * Fitur: Expense Tracker, Bookmark Manager, Quiz App
 * Logika Asli Tidak Diubah.
 */

/* ==========================================
   UTILITAS & MODAL GLOBAL
========================================== */
function $(selector) { return document.querySelector(selector); }
function $all(selector) { return document.querySelectorAll(selector); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function openModal(modalId) {
  const m = $(modalId);
  m.classList.remove("hidden");
  m.classList.add("flex");
}
function closeModal(modalId) {
  const m = $(modalId);
  m.classList.add("hidden");
  m.classList.remove("flex");
}

$all(".btn-close-modal, .modal-backdrop").forEach(btn => {
  btn.addEventListener("click", function() {
    closeModal("#modal-exp-edit");
    closeModal("#modal-bm-edit");
  });
});


/* ==========================================
   SISTEM TAB NAVIGATION (URL ROUTING / HASH)
========================================== */
const TAB_KEY = "pabwe_active_tab";
const tabs = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz")
};

function renderActiveTab(tabId) {
  if(!panels[tabId]) tabId = "expense"; 

  // Sembunyikan semua panel
  Object.values(panels).forEach(p => p.classList.add("hidden"));
  
  // Reset gaya semua tab menjadi tidak aktif (kertas cetak)
  tabs.forEach(t => {
    t.className = "tab-btn flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition border-b-4 sm:border-b-0 sm:border-r-2 border-stone-800 text-stone-800 hover:bg-stone-200";
  });

  // Tampilkan panel yang aktif
  panels[tabId].classList.remove("hidden");

  // Ubah gaya tab yang aktif (Tinta Blok Hitam / Merah)
  const activeBtn = $(`[data-tab="${tabId}"]`);
  if(activeBtn) {
    const bgColor = tabId === 'quiz' ? 'bg-[#9A161F]' : 'bg-stone-800';
    activeBtn.className = `tab-btn flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition sm:border-r-2 border-stone-800 ${bgColor} text-[#F4F0EB]`;
  }

  // Simpan persistensi ke LocalStorage (sesuai spesifikasi soal PABWE)
  localStorage.setItem(TAB_KEY, tabId);
}

// Fungsi untuk menangani perubahan URL (Hash)
function handleRouting() {
  // Ambil teks setelah tanda '#' di URL (contoh: dari '#bookmark' menjadi 'bookmark')
  const hash = window.location.hash.replace("#", "");
  
  if (panels[hash]) {
    // Jika path valid, tampilkan tab tersebut
    renderActiveTab(hash);
  } else {
    // Jika path kosong/tidak valid saat pertama kali web dibuka:
    // Cek LocalStorage untuk mengembalikan tab terakhir yang dibuka
    const savedTab = localStorage.getItem(TAB_KEY) || "expense";
    // Paksa URL berubah sesuai tab terakhir (replaceState agar tidak merusak history Back/Forward)
    window.history.replaceState(null, null, `#${savedTab}`);
    renderActiveTab(savedTab);
  }
}

// Event Listener ketika hash URL berubah (klik link atau tombol back/forward di browser)
window.addEventListener("hashchange", handleRouting);

// Jalankan routing saat web pertama kali dimuat
handleRouting();

/* ==========================================
   FITUR 1: EXPENSE TRACKER
========================================== */
const EXP_KEY = "pabwe_expenses";
let expenses = JSON.parse(localStorage.getItem(EXP_KEY)) || [];

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
  let filtered = expenses.filter(e => 
    e.title.toLowerCase().includes(expSearch.value.toLowerCase()) || 
    e.category.toLowerCase().includes(expSearch.value.toLowerCase())
  );

  if (expFilter.value !== "All") {
    filtered = filtered.filter(e => e.type === expFilter.value);
  }

  filtered.sort((a, b) => {
    if (expSort.value === "newest") return new Date(b.date) - new Date(a.date);
    if (expSort.value === "oldest") return new Date(a.date) - new Date(b.date);
    if (expSort.value === "highest") return b.amount - a.amount;
    if (expSort.value === "lowest") return a.amount - b.amount;
  });

  let totalIn = 0, totalOut = 0;
  expenses.forEach(e => {
    if (e.type === "Pemasukan") totalIn += e.amount;
    else totalOut += e.amount;
  });

  $("#exp-total-in").textContent = `Rp ${totalIn.toLocaleString('id-ID')}`;
  $("#exp-total-out").textContent = `Rp ${totalOut.toLocaleString('id-ID')}`;
  $("#exp-balance").textContent = `Rp ${(totalIn - totalOut).toLocaleString('id-ID')}`;

  expList.innerHTML = "";
  if (filtered.length === 0) {
    expEmpty.classList.remove("hidden");
  } else {
    expEmpty.classList.add("hidden");
    filtered.forEach(e => {
      const li = document.createElement("li");
      // Desain List: Brutalist/Kertas dengan border tebal
      li.className = "flex justify-between items-center bg-[#FAFAF7] border-2 border-stone-800 p-4 shadow-[4px_4px_0_0_#292524]";
      
      const isIncome = e.type === "Pemasukan";
      const catStyle = isIncome ? "bg-stone-800 text-white" : "bg-[#9A161F] text-white";
      const amountColor = isIncome ? "text-stone-800" : "text-[#9A161F]";
      const sign = isIncome ? "+" : "-";

      li.innerHTML = `
        <div>
          <p class="font-bold font-display text-lg text-stone-900">${e.title} <span class="text-[10px] uppercase tracking-widest font-sans px-2 py-1 ml-2 ${catStyle}">${e.category}</span></p>
          <p class="text-sm text-stone-500 font-serif italic mt-1"><i class="ti ti-calendar"></i> ${e.date}</p>
        </div>
        <div class="text-right">
          <p class="text-xl font-bold font-display ${amountColor}">${sign} Rp ${e.amount.toLocaleString('id-ID')}</p>
          <div class="mt-2 flex gap-3 justify-end font-bold text-sm tracking-widest uppercase">
            <button class="text-stone-600 hover:text-stone-900 hover:underline" onclick="editExp('${e.id}')">Ubah</button>
            <button class="text-[#9A161F] hover:text-red-900 hover:underline" onclick="deleteExp('${e.id}')">Hapus</button>
          </div>
        </div>
      `;
      expList.appendChild(li);
    });
  }
}

expForm.addEventListener("submit", (e) => {
  e.preventDefault();
  expenses.push({
    id: generateId(),
    title: $("#exp-title").value,
    type: $("#exp-type").value,
    category: $("#exp-category").value,
    amount: parseInt($("#exp-amount").value),
    date: $("#exp-date").value
  });
  saveExp();
  renderExp();
  expForm.reset();
});

window.deleteExp = (id) => {
  if (confirm("Hapus catatan ini secara permanen?")) {
    expenses = expenses.filter(e => e.id !== id);
    saveExp();
    renderExp();
  }
};

window.editExp = (id) => {
  const exp = expenses.find(e => e.id === id);
  if(!exp) return;
  $("#edit-exp-id").value = exp.id;
  $("#edit-exp-title").value = exp.title;
  $("#edit-exp-type").value = exp.type;
  $("#edit-exp-category").value = exp.category;
  $("#edit-exp-amount").value = exp.amount;
  $("#edit-exp-date").value = exp.date;
  openModal("#modal-exp-edit");
};

$("#form-exp-edit").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#edit-exp-id").value;
  const index = expenses.findIndex(e => e.id === id);
  if(index !== -1) {
    expenses[index] = {
      id,
      title: $("#edit-exp-title").value,
      type: $("#edit-exp-type").value,
      category: $("#edit-exp-category").value,
      amount: parseInt($("#edit-exp-amount").value),
      date: $("#edit-exp-date").value
    };
    saveExp();
    renderExp();
    closeModal("#modal-exp-edit");
  }
});

expSearch.addEventListener("input", renderExp);
expFilter.addEventListener("change", renderExp);
expSort.addEventListener("change", renderExp);

renderExp();


/* ==========================================
   FITUR 2: BOOKMARK MANAGER
========================================== */
const BM_KEY = "pabwe_bookmarks";
let bookmarks = JSON.parse(localStorage.getItem(BM_KEY)) || [];

const bmForm = $("#form-bookmark");
const bmList = $("#bm-list");
const bmSearch = $("#bm-search");
const bmSort = $("#bm-sort");

function saveBm() { localStorage.setItem(BM_KEY, JSON.stringify(bookmarks)); }

function renderBm() {
  let filtered = bookmarks.filter(b => 
    b.title.toLowerCase().includes(bmSearch.value.toLowerCase()) || 
    b.category.toLowerCase().includes(bmSearch.value.toLowerCase()) ||
    b.url.toLowerCase().includes(bmSearch.value.toLowerCase())
  );

  filtered.sort((a, b) => {
    if (bmSort.value === "newest") return b.timestamp - a.timestamp;
    if (bmSort.value === "asc") return a.title.localeCompare(b.title);
    if (bmSort.value === "desc") return b.title.localeCompare(a.title);
  });

  bmList.innerHTML = "";
  if (filtered.length === 0) {
    $("#bm-empty").classList.remove("hidden");
  } else {
    $("#bm-empty").classList.add("hidden");
    filtered.forEach(b => {
      const li = document.createElement("li");
      // Desain List Kertas Bookmark
      li.className = "bg-[#FAFAF7] border-2 border-stone-800 p-5 flex flex-col justify-between shadow-[4px_4px_0_0_#292524]";
      li.innerHTML = `
        <div>
          <div class="flex justify-between items-start mb-3">
            <h3 class="font-bold font-display text-xl text-stone-900 line-clamp-1">${b.title}</h3>
            <span class="text-[10px] border border-stone-800 bg-transparent text-stone-800 px-2 py-1 uppercase tracking-widest font-bold">${b.category}</span>
          </div>
          <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="text-sm font-serif italic text-[#9A161F] hover:bg-[#9A161F] hover:text-white transition break-all block mb-6 p-1"><i class="ti ti-external-link"></i> ${b.url}</a>
        </div>
        <div class="flex gap-0 border-t-2 border-stone-800 mt-auto pt-4">
          <button class="flex-1 bg-transparent text-stone-800 py-2 text-sm font-bold uppercase tracking-widest hover:bg-stone-200 border-r-2 border-stone-800" onclick="editBm('${b.id}')">Ubah</button>
          <button class="flex-1 bg-transparent text-[#9A161F] py-2 text-sm font-bold uppercase tracking-widest hover:bg-red-100" onclick="deleteBm('${b.id}')">Hapus</button>
        </div>
      `;
      bmList.appendChild(li);
    });
  }
}

bmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = $("#bm-url").value;
  if(!/^https?:\/\//i.test(url)) return alert("URL tidak valid. Harus diawali http:// atau https://");
  bookmarks.push({
    id: generateId(),
    title: $("#bm-title").value,
    url: url,
    category: $("#bm-category").value,
    timestamp: Date.now()
  });
  saveBm();
  renderBm();
  bmForm.reset();
});

window.deleteBm = (id) => {
  if (confirm("Hapus tautan ini?")) {
    bookmarks = bookmarks.filter(b => b.id !== id);
    saveBm();
    renderBm();
  }
};

window.editBm = (id) => {
  const bm = bookmarks.find(b => b.id === id);
  if(!bm) return;
  $("#edit-bm-id").value = bm.id;
  $("#edit-bm-title").value = bm.title;
  $("#edit-bm-url").value = bm.url;
  $("#edit-bm-category").value = bm.category;
  openModal("#modal-bm-edit");
};

$("#form-bm-edit").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#edit-bm-id").value;
  const url = $("#edit-bm-url").value;
  if(!/^https?:\/\//i.test(url)) return alert("URL tidak valid.");
  
  const index = bookmarks.findIndex(b => b.id === id);
  if(index !== -1) {
    bookmarks[index].title = $("#edit-bm-title").value;
    bookmarks[index].url = url;
    bookmarks[index].category = $("#edit-bm-category").value;
    saveBm();
    renderBm();
    closeModal("#modal-bm-edit");
  }
});

bmSearch.addEventListener("input", renderBm);
bmSort.addEventListener("change", renderBm);

renderBm();


/* ==========================================
   FITUR 3: KUIS INTERAKTIF
========================================== */
const QUIZ_KEY = "pabwe_quiz_highscore";
let quizHighScore = localStorage.getItem(QUIZ_KEY) || 0;
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
    // Desain Box Jawaban
    btn.className = "text-left w-full border-2 border-stone-800 bg-[#FAFAF7] p-5 font-bold font-serif text-lg text-stone-800 hover:bg-stone-200 transition shadow-[4px_4px_0_0_#292524]";
    btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
    btn.onclick = () => handleAnswer(idx);
    optContainer.appendChild(btn);
  });

  timer = setInterval(() => {
    timeLeft--;
    $("#quiz-timer").textContent = timeLeft;
    if(timeLeft <= 0) {
      handleAnswer(-1); // Waktu habis (salah)
    }
  }, 1000);
}

function handleAnswer(selectedIndex) {
  clearInterval(timer);
  const correctIndex = quizQuestions[currQIndex].ans;
  
  if(selectedIndex === correctIndex) quizScore++;
  
  const btns = $("#quiz-options").children;
  for(let i=0; i<btns.length; i++) {
    btns[i].disabled = true;
    btns[i].classList.remove("hover:bg-stone-200");
    
    // Perubahan UI Logika (Sesuai Gaya Tactility)
    if(i === correctIndex) {
      btns[i].classList.add("bg-stone-800", "text-[#F4F0EB]"); // Benar jadi blok hitam
    } else if (i === selectedIndex) {
      btns[i].classList.add("bg-[#9A161F]", "text-[#F4F0EB]", "border-[#9A161F]"); // Salah jadi blok merah
    } else {
      btns[i].classList.add("opacity-50");
    }
  }

  setTimeout(() => {
    currQIndex++;
    if(currQIndex < quizQuestions.length) {
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
  
  if(quizScore > quizHighScore) {
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