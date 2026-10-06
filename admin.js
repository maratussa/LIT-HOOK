// 1. Konfigurasi Supabase Client
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Element DOM Utama
const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const adminDashboard = document.getElementById("adminDashboard");
const loginError = document.getElementById("loginError");

// 3. Cek Sesi Saat Halaman Dimuat
window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    console.log("Sesi aktif ditemukan untuk User ID:", session.user.id);
    await checkAdminRole(session.user.id);
  }
});

// 4. Form Submit Handler (Login)
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (loginError) loginError.classList.add("hidden");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showError(error.message);
      return;
    }

    if (data && data.user) {
      await checkAdminRole(data.user.id);
    }
  });
}

// 5. Verifikasi Hak Akses Admin & Buka Dashboard
async function checkAdminRole(userId) {
  const { data, error } = await supabaseClient
    .from("admin_profiles")
    .select("role")
    .eq("auth_user_id", userId)
    .single();

  if (error || !data || data.role !== "admin") {
    showError("Akses Ditolak: Anda bukan administrator.");
    return;
  }

  // Tampilkan Dashboard
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

  // Muat Data Katalog & Review
  loadBooks();
  loadReviews();
}

// 6. Fungsi Logout Global (Sesuai onclick di admin.html)
async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

// Jaga-jaga jika tombol logout menggunakan ID
document.addEventListener("click", async (e) => {
  if (e.target && (e.target.id === "logoutBtn" || e.target.closest("#logoutBtn"))) {
    await handleLogout();
  }
});

// 7. Navigasi Tab (Kelola Buku vs Review)
function switchTab(tabName) {
  const tabBooks = document.getElementById("tab-books");
  const tabReviews = document.getElementById("tab-reviews");
  const btnBooks = document.getElementById("btn-tab-books");
  const btnReviews = document.getElementById("btn-tab-reviews");

  if (tabName === "books") {
    if (tabBooks) tabBooks.classList.remove("hidden");
    if (tabReviews) tabReviews.classList.add("hidden");
    if (btnBooks) btnBooks.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white text-left font-semibold";
    if (btnReviews) btnReviews.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-left transition font-semibold";
  } else if (tabName === "reviews") {
    if (tabBooks) tabBooks.classList.add("hidden");
    if (tabReviews) tabReviews.classList.remove("hidden");
    if (btnBooks) btnBooks.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-left transition font-semibold";
    if (btnReviews) btnReviews.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white text-left font-semibold";
  }
}

// 8. Load Data Buku
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
          <button onclick="generateQr('${book.id}', '${book.title}')" class="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700" title="Cetak QR">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
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

// 9. Load Ulasan Siswa
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

// 10. Kontrol Modal Form Buku
function openBookModal() {
  const modal = document.getElementById("admin-book-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeBookModal() {
  const modal = document.getElementById("admin-book-modal");
  const form = document.getElementById("book-form");
  if (modal) modal.classList.add("hidden");
  if (form) form.reset();
}

// 11. Handler Tambah Buku
document.addEventListener("DOMContentLoaded", () => {
  const bookForm = document.getElementById("book-form");
  if (bookForm) {
    bookForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = bookForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      const bookData = {
        title: document.getElementById("form-title").value,
        author: document.getElementById("form-author").value,
        ddc_code: document.getElementById("form-ddc").value,
        shelf_location: document.getElementById("form-shelf").value,
        category: document.getElementById("form-category").value,
        cover_url: document.getElementById("form-cover").value,
        description: document.getElementById("form-desc") ? document.getElementById("form-desc").value : "",
        chapter_1_url: document.getElementById("form-ch1").value || null,
        chapter_2_url: document.getElementById("form-ch2").value || null,
        chapter_3_url: document.getElementById("form-ch3").value || null,
      };

      const { error } = await supabaseClient.from("books").insert([bookData]);

      if (submitBtn) submitBtn.disabled = false;

      if (error) {
        alert("Gagal menyimpan buku: " + error.message);
      } else {
        alert("Buku berhasil ditambahkan!");
        closeBookModal();
        loadBooks();
      }
    });
  }
});

// 12. Modal QR Code & Hapus Buku
function generateQr(bookId, bookTitle) {
  const qrModal = document.getElementById("qr-modal");
  const qrContainer = document.getElementById("qrcode");
  const titleElem = document.getElementById("qr-book-title");

  if (!qrModal || !qrContainer) return;

  qrContainer.innerHTML = "";
  if (titleElem) titleElem.textContent = bookTitle;

  const targetUrl = `${window.location.origin}/preview.html?id=${bookId}`;

  new QRCode(qrContainer, {
    text: targetUrl,
    width: 160,
    height: 160,
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
  if (loginError) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
  } else {
    alert(msg);
  }
}
