// Konfigurasi Supabase Client
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";

let supabaseClient = null;
let editingBookId = null;

try {
  if (typeof supabase !== "undefined") {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Gagal menginisialisasi Supabase Client:", e);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      await checkAdminRole(session.user.id);
    }
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

      if (!email || !password) {
        showError("Email dan password wajib diisi!");
        return;
      }

      if (!supabaseClient) {
        showError("Library Supabase belum siap, silakan muat ulang halaman.");
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        showError("Login Gagal: " + error.message);
        return;
      }

      if (data && data.user) {
        await checkAdminRole(data.user.id);
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

      const videoInput = document.getElementById("form-video") || document.getElementById("book-video-url");
      const videoValue = videoInput ? videoInput.value.trim() : "";

      const bookData = {
        title: document.getElementById("form-title").value,
        author: document.getElementById("form-author").value,
        ddc_code: document.getElementById("form-ddc").value,
        shelf_location: document.getElementById("form-shelf").value,
        category: document.getElementById("form-category").value,
        cover_url: document.getElementById("form-cover").value,
        description: document.getElementById("form-desc") ? document.getElementById("form-desc").value : null,
        video_url: videoValue, // Mengirimkan ke kolom video_url
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

      // Jika gagal karena kolom video_url tidak ada, coba kirim tanpa kolom video atau beri penanganan khusus
      if (response.error && response.error.message.includes("column")) {
        console.warn("Mencoba fallback nama kolom...");
        delete bookData.video_url;
        bookData.url_video = videoValue;
        
        if (editingBookId) {
          response = await supabaseClient.from("books").update(bookData).eq("id", editingBookId);
        } else {
          response = await supabaseClient.from("books").insert([bookData]);
        }
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

async function checkAdminRole(userId) {
  if (supabaseClient) {
    await supabaseClient
      .from("admin_profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .maybeSingle();
  }
  showDashboard();
}

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

async function handleLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  window.location.reload();
}

document.addEventListener("click", async (e) => {
  if (e.target && (e.target.id === "logoutBtn" || e.target.closest("#logoutBtn"))) {
    await handleLogout();
  }
});

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

async function loadBooks() {
  const tableBody = document.getElementById("admin-books-table");
  if (!tableBody || !supabaseClient) return;

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
