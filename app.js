// INISIALISASI SUPABASE CLIENT
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper Parsing URL Google Drive
function parseGoogleDriveUrl(url) {
  if (!url) return '';
  const match = url.match(/(?:id=|\/d\/|\/file\/d\/)([a-zA-Z0-9_-]+)/);
  return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

// Inisialisasi Halaman
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  fetchBooks();
  setupRealtime();
});

// Load Data Buku dari Supabase
async function fetchBooks() {
  const { data: books, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);

  const container = document.getElementById('books-grid');
  document.getElementById('stat-books').innerText = books.length;

  container.innerHTML = books.map(book => `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      <img src="${book.cover_url}" alt="${book.title}" class="h-48 w-full object-cover">
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">${book.category || 'Umum'}</span>
          <h3 class="font-bold text-slate-900 mt-2 text-sm line-clamp-1">${book.title}</h3>
          <p class="text-xs text-slate-500">${book.author}</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] text-slate-400 font-mono">DDC: ${book.ddc}</span>
          <button onclick="openBookDetail('${book.id}')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
            Lihat Teaser
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Buka Detail / Teaser Buku
async function openBookDetail(bookId) {
  const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single();
  if (!book) return;

  // Catat Log Scan QR
  await supabase.from('qr_scans').insert({ book_id: bookId, source: 'web_view' });

  const modal = document.getElementById('book-modal');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6 mb-6">
      <img src="${book.cover_url}" class="w-32 h-44 object-cover rounded-xl shadow mx-auto md:mx-0">
      <div>
        <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">${book.category || 'Umum'}</span>
        <h2 class="text-xl font-extrabold text-slate-900 mt-2">${book.title}</h2>
        <p class="text-xs text-slate-500 mb-3">Penulis: ${book.author}</p>
        <p class="text-xs text-slate-600 leading-relaxed">${book.description || 'Tidak ada deskripsi.'}</p>
      </div>
    </div>

    <!-- CUPLIKAN BAB -->
    <div class="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
      <h4 class="font-bold text-xs uppercase text-slate-400 mb-3">Intip Cuplikan Bab</h4>
      <div class="flex gap-2 mb-3">
        <button onclick="showChapter(1, '${parseGoogleDriveUrl(book.chapter1_url)}')" class="flex-1 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg">Bab 1</button>
        <button onclick="showChapter(2, '${parseGoogleDriveUrl(book.chapter2_url)}')" class="flex-1 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Bab 2</button>
        <button onclick="showChapter(3, '${parseGoogleDriveUrl(book.chapter3_url)}')" class="flex-1 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Bab 3</button>
      </div>
      <div id="chapter-view" class="bg-slate-900 rounded-xl min-h-[200px] flex items-center justify-center p-2">
        <img id="chapter-img" src="${parseGoogleDriveUrl(book.chapter1_url)}" class="max-h-80 object-contain rounded">
      </div>
    </div>

    <!-- CLIFFHANGER & RAK -->
    <div class="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-6 rounded-2xl text-center mb-6">
      <p class="text-xs text-amber-300 font-bold uppercase tracking-wider mb-1">Penasaran Akhir Ceritanya?</p>
      <h3 class="text-lg font-black mb-3">Temukan Jawabannya di Rak Buku Perpustakaan!</h3>
      <div class="bg-white/10 backdrop-blur-md rounded-xl p-3 inline-block text-left text-xs space-y-1">
        <p><strong>DDC:</strong> ${book.ddc}</p>
        <p><strong>Lokasi Rak:</strong> ${book.shelf_number || 'Rak Utama'}</p>
        <p><strong>Status:</strong> ${book.availability_status || 'Tersedia'}</p>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function showChapter(num, url) {
  const img = document.getElementById('chapter-img');
  if (url) {
    img.src = url;
    img.classList.remove('hidden');
  } else {
    img.classList.add('hidden');
  }
}

function closeModal() {
  document.getElementById('book-modal').classList.add('hidden');
}

// Sync Realtime Update dari Supabase
function setupRealtime() {
  supabase.channel('public-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      fetchBooks();
    })
    .subscribe();
}