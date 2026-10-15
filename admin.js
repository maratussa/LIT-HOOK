// Konfigurasi Supabase Client
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editingBookId = null;
let scanChartInstance = null;
let realtimeSubscription = null;

let allAdminBooks = []; // Array penampung seluruh data buku
let selectedBookIds = new Set(); // Set penampung ID buku terpilih untuk cetak masal

// HELPER: Upload File Gambar ke Supabase Storage
async function uploadImageToSupabase(fileInput, bucketName = "resensi_buku") {
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    return null;
  }

  const file = fileInput.files[0];
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabaseClient
    .storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Gagal mengunggah file:", error.message);
    throw new Error(`Gagal upload ${file.name}: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseClient
    .storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData ? publicUrlData.publicUrl : null;
}

window.addEventListener("DOMContentLoaded", async () => {
  // Set default filter bulan ke bulan saat ini (YYYY-MM)
  const monthPicker = document.getElementById("report-month-picker");
  if (monthPicker && !monthPicker.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    monthPicker.value = `${yyyy}-${mm}`;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    await checkAdminRole(session.user.id);
  }
});

// Login Form
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const loginError = document.getElementById("loginError");
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

  const targetLogin = document.getElementById("loginSection");
  const targetDashboard = document.getElementById("adminDashboard");

  if (targetLogin) {
    targetLogin.classList.add("hidden");
    targetLogin.style.display = "none";
  }

  if (targetDashboard) {
    targetDashboard.classList.remove("hidden");
    targetDashboard.style.display = "flex";
  }

  await loadDashboardStats();
  await loadBooks();
  await loadReviews();
  setupRealtimeScanUpdates();
}

// SETUP SUPABASE REALTIME LISTENER UNTUK AUTO-UPDATE STATISTIK
function setupRealtimeScanUpdates() {
  if (realtimeSubscription) return;

  realtimeSubscription = supabaseClient
    .channel('public:scan_updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_logs' }, () => {
      loadDashboardStats();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'books' }, () => {
      loadDashboardStats();
      loadBooks();
    })
    .subscribe();
}

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
    if (btnReviews) btnReviews.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold transition shadow-lg shadow-indigo-600/20 text-left";
  }
}

// LOAD DASHBOARD STATS & LAPORAN BULANAN
async function loadDashboardStats() {
  try {
    // 1. Total Buku
    const { count: bookCount } = await supabaseClient
      .from("books")
      .select("*", { count: "exact", head: true });

    const statBooks = document.getElementById("stat-total-books");
    if (statBooks) statBooks.textContent = bookCount || 0;

    // 2. Total Review
    const { count: reviewCount } = await supabaseClient
      .from("reviews")
      .select("*", { count: "exact", head: true });

    const statReviews = document.getElementById("stat-total-reviews");
    if (statReviews) statReviews.textContent = reviewCount || 0;

    // 3. Ambil Filter Bulan
    const monthPicker = document.getElementById("report-month-picker");
    let selectedYear, selectedMonth;

    if (monthPicker && monthPicker.value) {
      const parts = monthPicker.value.split("-");
      selectedYear = parseInt(parts[0]);
      selectedMonth = parseInt(parts[1]) - 1;
    } else {
      const now = new Date();
      selectedYear = now.getFullYear();
      selectedMonth = now.getMonth();
    }

    const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

    // 4. Query Scan Logs Sesuai Rentang Bulan
    const { data: logs } = await supabaseClient
      .from("scan_logs")
      .select("book_id, created_at")
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth);

    const monthlyCountMap = {};
    let totalMonthlyScans = 0;

    if (logs) {
      totalMonthlyScans = logs.length;
      logs.forEach(log => {
        monthlyCountMap[log.book_id] = (monthlyCountMap[log.book_id] || 0) + 1;
      });
    }

    const statMonthlyScans = document.getElementById("stat-monthly-scans");
    if (statMonthlyScans) statMonthlyScans.textContent = totalMonthlyScans;

    // 5. Query Semua Buku untuk Statistik Global & Diagram
    const { data: books } = await supabaseClient
      .from("books")
      .select("id, title, scan_count")
      .order("created_at", { ascending: false });

    if (books && books.length > 0) {
      const globalTotalScans = books.reduce((acc, b) => acc + (Number(b.scan_count) || 0), 0);
      const statTotalScans = document.getElementById("stat-total-scans");
      if (statTotalScans) statTotalScans.textContent = globalTotalScans;

      // Cari Buku Terpopuler
      let maxScan = -1;
      let popularTitle = "-";
      books.forEach(b => {
        const count = Number(b.scan_count) || 0;
        if (count > maxScan && count > 0) {
          maxScan = count;
          popularTitle = b.title;
        }
      });

      const statPop = document.getElementById("stat-popular-book");
      if (statPop) statPop.textContent = popularTitle;

      // Data Diagram berdasarkan Scan Bulan Ini
      const labels = books.map(b => b.title.length > 12 ? b.title.substring(0, 12) + "..." : b.title);
      const scanData = books.map(b => monthlyCountMap[b.id] || 0);

      renderChart(labels, scanData);
    } else {
      renderChart([], []);
    }
  } catch (err) {
    console.error("Gagal memuat statistik:", err);
  }
}

// RENDER DIAGRAM CHART.JS RESPONSIIF
function renderChart(labels, data) {
  const ctx = document.getElementById("scanChart");
  if (!ctx) return;

  if (scanChartInstance) {
    scanChartInstance.destroy();
  }

  const maxVal = data.length > 0 ? Math.max(...data) : 5;
  const suggestedMaxY = maxVal < 5 ? 5 : Math.ceil(maxVal * 1.25);

  scanChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Scan Bulan Ini",
        data: data,
        backgroundColor: "#6366f1",
        hoverBackgroundColor: "#4f46e5",
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Dipindai: ${context.parsed.y} kali`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: suggestedMaxY,
          grid: { color: "#f1f5f9" },
          ticks: { stepSize: 1, font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { 
            font: { size: 9, weight: "bold" },
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
}

// LOAD DATA BUKU DARI SUPABASE
async function loadBooks() {
  const { data: books, error } = await supabaseClient
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat buku:", error.message);
    return;
  }

  allAdminBooks = books || [];
  
  // Terapkan filter pencarian jika kolom pencarian tidak kosong
  filterAdminBooks();
}

// RENDER BUKU KE TABEL
function renderAdminBooksTable(books) {
  const tableBody = document.getElementById("admin-books-table");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (books.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-400 text-xs italic">
          Buku tidak ditemukan sesuai kata kunci pencarian.
        </td>
      </tr>
    `;
    return;
  }

  books.forEach((book) => {
    const safeBookJson = JSON.stringify(book).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
    const isChecked = selectedBookIds.has(book.id) ? "checked" : "";

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="p-4 text-center">
        <input type="checkbox" value="${book.id}" data-title="${book.title.replace(/"/g, '&quot;')}" ${isChecked} onchange="toggleBookSelection(this)" class="book-checkbox rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
      </td>
      <td class="p-4 flex items-center gap-3">
        <img src="${book.cover_url || 'https://via.placeholder.com/40'}" class="w-10 h-14 object-cover rounded shadow-sm">
        <div>
          <p class="font-bold text-slate-800 line-clamp-1">${book.title}</p>
          <p class="text-xs text-slate-500">${book.author}</p>
        </div>
      </td>
      <td class="p-4 text-xs font-semibold text-slate-600">${book.category || '-'}</td>
      <td class="p-4 text-xs">
        <span class="block font-bold text-indigo-600">${book.ddc_code || '-'}</span>
        <span class="text-slate-500">${book.shelf_location || '-'}</span>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-xs font-extrabold rounded-full bg-indigo-50 text-indigo-600">
          ${book.scan_count || 0} scan
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

  // Sinkronkan status Checkbox "Pilih Semua"
  const allCheckboxes = document.querySelectorAll(".book-checkbox");
  const selectAllCb = document.getElementById("select-all-books");
  if (selectAllCb) {
    selectAllCb.checked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
  }

  if (window.lucide) lucide.createIcons();
}

// FUNGSI PENCARIAN (FILTER REALTIME)
function filterAdminBooks() {
  const searchInput = document.getElementById("admin-search-input");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  if (!query) {
    renderAdminBooksTable(allAdminBooks);
    return;
  }

  const filtered = allAdminBooks.filter((book) => {
    const titleMatch = (book.title || "").toLowerCase().includes(query);
    const authorMatch = (book.author || "").toLowerCase().includes(query);
    const categoryMatch = (book.category || "").toLowerCase().includes(query);
    const ddcMatch = (book.ddc_code || "").toLowerCase().includes(query);
    const shelfMatch = (book.shelf_location || "").toLowerCase().includes(query);

    return titleMatch || authorMatch || categoryMatch || ddcMatch || shelfMatch;
  });

  renderAdminBooksTable(filtered);
}

// TOGGLE PILIH SEMUA BUKU
function toggleSelectAllBooks(masterCheckbox) {
  const checkboxes = document.querySelectorAll(".book-checkbox");
  checkboxes.forEach((cb) => {
    cb.checked = masterCheckbox.checked;
    if (masterCheckbox.checked) {
      selectedBookIds.add(cb.value);
    } else {
      selectedBookIds.delete(cb.value);
    }
  });
  updateSelectedCount();
}

// TOGGLE PILIH SATU BUKU
function toggleBookSelection(checkbox) {
  if (checkbox.checked) {
    selectedBookIds.add(checkbox.value);
  } else {
    selectedBookIds.delete(checkbox.value);
  }

  const allCheckboxes = document.querySelectorAll(".book-checkbox");
  const selectAllCb = document.getElementById("select-all-books");
  if (selectAllCb) {
    selectAllCb.checked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
  }

  updateSelectedCount();
}

// UPDATE INDIKATOR JUMLAH TERPILIH
function updateSelectedCount() {
  const countElem = document.getElementById("selected-count");
  if (countElem) countElem.textContent = selectedBookIds.size;
}

// CETAK QR CODE TUNGGAL
function generateQr(bookId, bookTitle) {
  renderQrGrid([{ id: bookId, title: bookTitle }]);
}

// CETAK QR CODE MASAL (YANG DITANDAI/DICENTANG)
function printSelectedQrs() {
  if (selectedBookIds.size === 0) {
    alert("Silakan pilih/centang minimal satu buku yang ingin dicetak QR Code-nya!");
    return;
  }

  const selectedItems = [];
  selectedBookIds.forEach((id) => {
    const book = allAdminBooks.find(b => b.id === id);
    if (book) {
      selectedItems.push({
        id: book.id,
        title: book.title
      });
    }
  });

  renderQrGrid(selectedItems);
}

// RENDER QR CODE KE MODAL
function renderQrGrid(items) {
  const qrModal = document.getElementById("qr-modal");
  const container = document.getElementById("qrcode-container");

  if (!qrModal || !container) return;

  container.innerHTML = "";

  const currentUrl = window.location.href;
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-2 shadow-sm";
    
    const qrDivId = `qr-item-${index}`;
    card.innerHTML = `
      <div id="${qrDivId}" class="flex justify-center p-1 bg-white"></div>
      <p class="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">${item.title}</p>
    `;
    container.appendChild(card);

    const targetUrl = `${baseUrl}/preview.html?id=${item.id}`;
    new QRCode(document.getElementById(qrDivId), {
      text: targetUrl,
      width: 120,
      height: 120,
    });
  });

  qrModal.classList.remove("hidden");
}

function closeQrModal() {
  const qrModal = document.getElementById("qr-modal");
  if (qrModal) qrModal.classList.add("hidden");
}

// LOAD ULASAN SISWA
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

function editBook(book) {
  editingBookId = book.id;

  document.getElementById("form-title").value = book.title || "";
  document.getElementById("form-author").value = book.author || "";
  document.getElementById("form-ddc").value = book.ddc_code || "";
  document.getElementById("form-shelf").value = book.shelf_location || "";
  document.getElementById("form-category").value = book.category || "";
  document.getElementById("form-cover").value = book.cover_url || "";
  
  document.getElementById("form-ch1-url-existing").value = book.chapter_1_url || "";
  document.getElementById("form-ch2-url-existing").value = book.chapter_2_url || "";
  document.getElementById("form-ch3-url-existing").value = book.chapter_3_url || "";

  document.getElementById("form-ch1-file").value = "";
  document.getElementById("form-ch2-file").value = "";
  document.getElementById("form-ch3-file").value = "";

  if (document.getElementById("form-desc")) {
    document.getElementById("form-desc").value = book.description || "";
  }

  const videoInput = document.getElementById("form-video");
  if (videoInput) {
    videoInput.value = book.video_url || "";
  }

  const modalTitle = document.getElementById("modal-title");
  if (modalTitle) modalTitle.textContent = "Edit Data Buku";

  const modal = document.getElementById("admin-book-modal");
  if (modal) modal.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const bookForm = document.getElementById("book-form");
  if (bookForm) {
    bookForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = bookForm.querySelector("button[type='submit']");
      const originalBtnText = submitBtn ? submitBtn.textContent : "Simpan Buku";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Mengunggah Gambar...";
      }

      try {
        const ch1Input = document.getElementById("form-ch1-file");
        const ch2Input = document.getElementById("form-ch2-file");
        const ch3Input = document.getElementById("form-ch3-file");

        const ch1Exist = document.getElementById("form-ch1-url-existing")?.value || null;
        const ch2Exist = document.getElementById("form-ch2-url-existing")?.value || null;
        const ch3Exist = document.getElementById("form-ch3-url-existing")?.value || null;

        const ch1Uploaded = await uploadImageToSupabase(ch1Input);
        const ch2Uploaded = await uploadImageToSupabase(ch2Input);
        const ch3Uploaded = await uploadImageToSupabase(ch3Input);

        const ch1Url = ch1Uploaded || ch1Exist;
        const ch2Url = ch2Uploaded || ch2Exist;
        const ch3Url = ch3Uploaded || ch3Exist;

        const videoInput = document.getElementById("form-video");
        const videoValue = videoInput ? videoInput.value.trim() : "";

        const bookData = {
          title: document.getElementById("form-title").value,
          author: document.getElementById("form-author").value,
          ddc_code: document.getElementById("form-ddc")?.value || null,
          shelf_location: document.getElementById("form-shelf")?.value || null,
          category: document.getElementById("form-category")?.value || null,
          cover_url: document.getElementById("form-cover")?.value || null,
          description: document.getElementById("form-desc") ? document.getElementById("form-desc").value : null,
          video_url: videoValue || null,
          chapter_1_url: ch1Url,
          chapter_2_url: ch2Url,
          chapter_3_url: ch3Url
        };

        let response;
        if (editingBookId) {
          response = await supabaseClient.from("books").update(bookData).eq("id", editingBookId);
        } else {
          response = await supabaseClient.from("books").insert([bookData]);
        }

        if (response.error) {
          alert("Gagal menyimpan data ke database: " + response.error.message);
        } else {
          alert(editingBookId ? "Buku berhasil diperbarui!" : "Buku berhasil ditambahkan!");
          closeBookModal();
          loadBooks();
          loadDashboardStats();
        }
      } catch (err) {
        console.error("Process Error:", err);
        alert(err.message || "Terjadi kesalahan saat menyimpan buku.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }
});

async function deleteBook(bookId) {
  if (!confirm("Apakah Anda yakin ingin menghapus buku ini?")) return;

  const { error } = await supabaseClient.from("books").delete().eq("id", bookId);
  if (error) {
    alert("Gagal menghapus buku: " + error.message);
  } else {
    selectedBookIds.delete(bookId);
    loadBooks();
    loadDashboardStats();
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

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

document.addEventListener("click", async (e) => {
  if (e.target && (e.target.id === "logoutBtn" || e.target.closest("#logoutBtn"))) {
    await handleLogout();
  }
});

function showError(msg) {
  const loginError = document.getElementById("loginError");
  if (loginError) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
  } else {
    alert(msg);
  }
}
