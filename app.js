// Konfigurasi Supabase Client
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Jalankan saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  fetchPublicBooks();
});

async function fetchPublicBooks() {
  // Cari kontainer utama di Beranda maupun Jelajahi Buku
  const container = document.getElementById("books-grid") || document.getElementById("books-container");
  const totalBooksElem = document.getElementById("total-books-count");

  // Ambil data buku dari tabel books
  const { data: books, error } = await supabaseClient
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data buku dari Supabase:", error.message);
    return;
  }

  // 1. Update Angka Statistik Total Buku Terdaftar
  if (totalBooksElem) {
    totalBooksElem.textContent = books ? books.length : 0;
  }

  // Jika kontainer tempat menampilkan kartu buku tidak ditemukan, hentikan
  if (!container) return;

  container.innerHTML = "";

  // 2. Tampilkan Pesan Jika Buku Kosong
  if (!books || books.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-slate-400 font-medium text-sm">Belum ada buku yang terdaftar di perpustakaan.</p>
      </div>
    `;
    return;
  }

  // 3. Render Kartu Buku ke Beranda & Jelajahi
  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between";
    
    // Navigasi saat kartu buku diklik
    card.onclick = () => {
      window.location.href = `preview.html?id=${book.id}`;
    };

    card.innerHTML = `
      <div>
        <div class="aspect-[3/4] w-full mb-3 overflow-hidden rounded-xl bg-slate-100">
          <img src="${book.cover_url || 'https://via.placeholder.com/150?text=No+Cover'}" 
               alt="${book.title}" 
               class="w-full h-full object-cover hover:scale-105 transition duration-300"
               onerror="this.src='https://via.placeholder.com/150?text=No+Cover'">
        </div>
        <span class="inline-block text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md mb-1">
          ${book.category || 'Umum'}
        </span>
        <h3 class="font-bold text-slate-800 text-sm line-clamp-1">${book.title}</h3>
        <p class="text-xs text-slate-500 mb-2">${book.author}</p>
      </div>
      <div class="flex items-center justify-between text-[11px] pt-2 border-t border-slate-50 font-semibold">
        <span class="text-indigo-600">${book.ddc_code || '-'}</span>
        <span class="text-slate-400">${book.shelf_location || '-'}</span>
      </div>
    `;
    container.appendChild(card);
  });
}
