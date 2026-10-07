// Konfigurasi Supabase Client
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editingBookId = null;

// Jalankan event listener saat DOM siap
document.addEventListener("DOMContentLoaded", async () => {
  // Cek Sesi Tersimpan
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  }

  // 1. HANDLER LOGIN ADMIN
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const loginError = document.getElementById("loginError");

      if (loginError) loginError.classList.add("hidden");

      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      // Proses Login Supabase Auth
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        showError("Login Gagal: " + error.message);
        return;
      }

      if (data && data.user) {
        showDashboard();
      }
    });
  }

  // 2. HANDLER SUBMIT FORM BUKU (TAMBAH / EDIT BUKU)
  const bookForm = document.getElementById("book-form");
  if (bookForm) {
    bookForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = bookForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      // Ambil elemen input video
      const videoInput = document.getElementById("form-video") || document.getElementById("book-video-url");
      const videoValue = videoInput ? videoInput.value.trim() : "";

      // HANYA MENGIRIM KAN KOLOM YANG PASTI ADA DI SUPABASE
      const bookData = {
        title: document.getElementById("form-title").value,
        author: document.getElementById("form-author").value,
        ddc_code: document.getElementById("form-ddc").value,
        shelf_location: document.getElementById("form-shelf").value,
        category: document.getElementById("form-category").value,
        cover_url: document.getElementById("form-cover").value,
        description: document.getElementById("form-desc") ? document.getElementById("form-desc").value : null,
        video_url: videoValue, // Nama kolom resmi di Supabase
        chapter_1_url: document.getElementById("form-ch1").value || null,
        chapter_2_url: document.getElementById("form-ch2").value || null,
        chapter_3_url: document.getElementById("form-ch3").value || null
      };

      let response;
      if (editingBookId) {
        response = await supabaseClient.from("books").update(bookData).eq("id", editingBookId);
      } else {
        response = await supabaseClient.from("books").insert([bookData]);
      }

      if (submitBtn) submitBtn.disabled = false;

      if (response.error) {
        alert("Gagal menyimpan data: " + response.error.message);
      } else {
        alert(editingBookId ? "Buku berhasil diperbarui!" : "Buku berhasil ditambahkan!");
        closeBookModal();
        loadBooks();
      }
    });
  }
});

// Fungsi Menampilkan Dashboard Admin
function showDashboard() {
  const targetLogin = document.getElementById("loginSection");
  const targetDashboard = document.getElementById("adminDashboard");

  if (targetLogin) {
    targetLogin.classList.add("hidden");
    targetLogin.style.setProperty("display", "none", "important");
  }

  if (targetDashboard) {
    targetDashboard.classList.remove("hidden");
    targetDashboard.style.setProperty("display", "flex", "important");
  }

  loadBooks();
  loadReviews();
}

// Fungsi Logout Global
async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

document.addEventListener("click", async (e) => {
  if (e.target && (e.target.id === "logoutBtn" || e.target.closest("#logoutBtn"))) {
    await handleLogout();
  }
});

// Navigasi Tab
function switchTab(tabName) {
  const tabBooks = document.getElementById("tab-books");
  const tabReviews = document.getElementById("tab-reviews");
  const btnBooks = document.getElementById("btn-tab-books");
  const btnReviews = document.getElementById("btn-tab-reviews");

  if (tabName === "books") {
    if (tabBooks) tabBooks.classList.remove("hidden");
    if (tabReviews) tabReviews.classList.add("hidden");
    if (btnBooks) btnBooks.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold transition shadow-lg shadow-indigo-600/20 text-left";
    if (btnReviews) btnReviews.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition text-left";
  } else if (tabName === "reviews") {
    if (tabBooks) tabBooks.classList.add("hidden");
    if (tabReviews) tabReviews.classList.remove("hidden");
    if (btnBooks) btnBooks.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition text-left";
    if (btnReviews) btnReviews.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold transition text-left";
  }
}

// Load Data Buku
async function loadBooks() {
  const tableBody = document.getElementById("admin-books-table");
  if (!tableBody) return;

  const { data: books, error } = await supabaseClient
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat buku:", error.message);
    return;
  }

  tableBody.innerHTML = "";
  books.forEach((book) => {
    const safeBookJson = JSON.stringify(book).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-4 flex items-center gap-3">
        <img src="${book.cover_url || 'https://via.placeholder.com/40'}" class="w-10 h-14 object-cover rounded shadow-sm">
        <div>
          <p class="font-bold text-slate-800">${book.title}</p>
          <p class="text-xs text-slate-500">${book.author}</p>
        </div>
      </td>
      <td class="p-4 text-xs font-semibold text-slate-600">${book.category || '-'}</td>
      <td class="p-4 text-xs">
        <span class="block font-bold text-indigo-600">${book.ddc_code || '-'}</span>
        <span class="text-slate-500">${book.shelf_location || '-'}</span>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-full ${book.status === 'Tersedia' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          ${book.status || 'Tersedia'}
        </span>
      </td>
      <td class="p-4 text-center">
        <div class="flex items-center justify-center gap-2">
          <button onclick="generateQr('${book.id}', '${book.title.replace(/'/g, "\\'")}')" class="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700" title="Cetak QR">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
          </button>
          <button onclick='editBook(${safeBookJson})' class="p-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-600" title="Edit Buku">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteBook('${book.id}')" class="p-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600" title="Hapus">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

// Load Review
async function loadReviews() {
  const tableBody = document.getElementById("admin-reviews-table");
  if (!tableBody) return;

  const { data: reviews, error } = await supabaseClient
    .from("reviews")
    .select("*, books(title)")
    .order("created_at", { ascending: false });

  if (error) return;

  tableBody.innerHTML = "";
  reviews.forEach((review) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-4 font-bold text-slate-800">${review.books ? review.books.title : 'Buku Dihapus'}</td>
      <td class="p-4 text-xs text-slate-600">${review.student_name || 'Anonim'}</td>
      <td class="p-4 text-xs">
        <div class="text-amber-500 font-bold">★ ${review.rating}/5</div>
        <p class="text-slate-600 italic">"${review.comment}"</p>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-full ${review.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
          ${review.is_approved ? 'Disetujui' : 'Pending'}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="toggleApproveReview('${review.id}', ${!review.is_approved})" class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100">
          ${review.is_approved ? 'Batalkan' : 'Setujui'}
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Modal Form Tambah Buku
function openBookModal() {
  editingBookId = null;
  const modal = document.getElementById("admin-book-modal");
  const form = document.getElementById("book-form");
  const modalTitle = document.getElementById("modal-title");

  if (form) form.reset();
  if (modalTitle) modalTitle.textContent = "Tambah Buku Baru";
  if (modal) modal.classList.remove("hidden");
}

function closeBookModal() {
  editingBookId = null;
  const modal = document.getElementById("admin-book-modal");
  const form = document.getElementById("book-form");
  if (modal) modal.classList.add("hidden");
  if (form) form.reset();
}

// Modal Form Edit Buku
function editBook(book) {
  editingBookId = book.id;

  document.getElementById("form-title").value = book.title || "";
  document.getElementById("form-author").value = book.author || "";
  document.getElementById("form-ddc").value = book.ddc_code || "";
  document.getElementById("form-shelf").value = book.shelf_location || "";
  document.getElementById("form-category").value = book.category || "";
  document.getElementById("form-cover").value = book.cover_url || "";
  
  if (document.getElementById("form-desc")) {
    document.getElementById("form-desc").value = book.description || "";
  }

  // Menampilkan data video saat edit
  const videoInput = document.getElementById("form-video") || document.getElementById("book-video-url");
  if (videoInput) {
    videoInput.value = book.video_url || "";
  }

  document.getElementById("form-ch1").value = book.chapter_1_url || "";
  document.getElementById("form-ch2").value = book.chapter_2_url || "";
  document.getElementById("form-ch3").value = book.chapter_3_url || "";

  const modalTitle = document.getElementById("modal-title");
  if (modalTitle) modalTitle.textContent = "Edit Data Buku";

  const modal = document.getElementById("admin-book-modal");
  if (modal) modal.classList.remove("hidden");
}

// Cetak QR Code
function generateQr(bookId, bookTitle) {
  const qrModal = document.getElementById("qr-modal");
  const qrContainer = document.getElementById("qrcode");
  const titleElem = document.getElementById("qr-book-title");

  if (!qrModal || !qrContainer) return;

  qrContainer.innerHTML = "";
  if (titleElem) titleElem.textContent = bookTitle;

  const currentUrl = window.location.href;
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
  const targetUrl = `${baseUrl}/preview.html?id=${bookId}`;

  new QRCode(qrContainer, {
    text: targetUrl,
    width: 180,
    height: 180,
  });

  qrModal.classList.remove("hidden");
}

function closeQrModal() {
  const qrModal = document.getElementById("qr-modal");
  if (qrModal) qrModal.classList.add("hidden");
}

async function deleteBook(bookId) {
  if (!confirm("Apakah Anda yakin ingin menghapus buku ini?")) return;

  const { error } = await supabaseClient.from("books").delete().eq("id", bookId);
  if (error) {
    alert("Gagal menghapus buku: " + error.message);
  } else {
    loadBooks();
  }
}

async function toggleApproveReview(reviewId, status) {
  const { error } = await supabaseClient.from("reviews").update({ is_approved: status }).eq("id", reviewId);
  if (error) {
    alert("Gagal memperbarui ulasan: " + error.message);
  } else {
    loadReviews();
  }
}

function showError(msg) {
  const loginError = document.getElementById("loginError");
