const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allBooks = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchPublicBooks();

  // Event listener untuk Pencarian & Filter
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");

  if (searchInput) searchInput.addEventListener("input", filterBooks);
  if (categoryFilter) categoryFilter.addEventListener("change", filterBooks);
});

async function fetchPublicBooks() {
  const container = document.getElementById("books-grid");

  const { data: books, error } = await supabaseClient
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data buku:", error.message);
    if (container) container.innerHTML = `<p class="col-span-full text-center text-rose-500 py-10">Gagal memuat katalog buku.</p>`;
    return;
  }

  allBooks = books || [];
  renderBooks(allBooks);
}

function renderBooks(books) {
  const container = document.getElementById("books-grid");
  if (!container) return;

  container.innerHTML = "";

  if (books.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center text-slate-400 py-12">Tidak ada buku yang cocok dengan pencarian.</p>`;
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between p-3";

    card.innerHTML = `
      <div>
        <!-- Gambar Sampul dengan Badge Kategori -->
        <div class="relative w-full h-44 rounded-xl overflow-hidden mb-3 bg-slate-100">
          <img src="${book.cover_url || 'https://via.placeholder.com/300x200?text=No+Cover'}" 
               alt="${book.title}" 
               class="w-full h-full object-cover"
               onerror="this.src='https://via.placeholder.com/300x200?text=No+Cover'">
          <span class="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
            ${book.category || 'Umum'}
          </span>
        </div>

        <!-- Meta DDC & Rak -->
        <div class="flex items-center gap-2 text-xs font-bold mb-1.5 px-1">
          <span class="text-indigo-600">${book.ddc_code || '-'}</span>
          <span class="text-amber-600 flex items-center gap-1">
            <i data-lucide="map-pin" class="w-3 h-3"></i> ${book.shelf_location || '-'}
          </span>
        </div>

        <!-- Judul & Penulis -->
        <div class="px-1 mb-2">
          <h3 class="font-bold text-slate-900 text-base leading-snug line-clamp-1">${book.title}</h3>
          <p class="text-xs text-slate-400 mt-0.5">Penulis: ${book.author || '-'}</p>
        </div>

        <!-- Deskripsi/Sinopsis Singkat -->
        <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed px-1 mb-4">
          ${book.description || 'Klik tombol di bawah untuk melihat teaser multimedia dan bab cuplikan buku ini.'}
        </p>
      </div>

      <!-- Tombol Aksi -->
      <button onclick="window.location.href='preview.html?id=${book.id}'" 
              class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm">
        <i data-lucide="layout-grid" class="w-4 h-4"></i> Pindai / Intip Teaser
      </button>
    `;

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function filterBooks() {
  const searchValue = document.getElementById("search-input").value.toLowerCase();
  const categoryValue = document.getElementById("category-filter").value;

  const filtered = allBooks.filter((book) => {
    const matchSearch = book.title.toLowerCase().includes(searchValue) || book.author.toLowerCase().includes(searchValue);
    const matchCategory = categoryValue === "" || book.category === categoryValue;
    return matchSearch && matchCategory;
  });

  renderBooks(filtered);
}
