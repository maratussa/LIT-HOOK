const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  checkAuth();

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('book-form').addEventListener('submit', handleSaveBook);
});

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminBooks();
  } else {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Login Gagal: " + error.message);
  } else {
    checkAuth();
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  checkAuth();
}

async function loadAdminBooks() {
  const { data: books } = await supabase.from('books').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('admin-books-table');

  tbody.innerHTML = books.map(b => `
    <tr class="hover:bg-slate-50">
      <td class="p-4 flex items-center gap-3">
        <img src="${b.cover_url}" class="w-10 h-14 object-cover rounded">
        <div>
          <p class="font-bold text-slate-800">${b.title}</p>
          <p class="text-xs text-slate-400">${b.author}</p>
        </div>
      </td>
      <td class="p-4 text-xs font-semibold">${b.category || '-'}</td>
      <td class="p-4 text-xs font-mono">${b.ddc} / ${b.shelf_number || '-'}</td>
      <td class="p-4 text-xs">
        <span class="px-2 py-1 rounded-full font-bold ${b.availability_status === 'Dipinjam' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
          ${b.availability_status || 'Tersedia'}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="deleteBook('${b.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold">Hapus</button>
      </td>
    </tr>
  `).join('');
}

async function handleSaveBook(e) {
  e.preventDefault();
  const title = document.getElementById('form-title').value;
  const author = document.getElementById('form-author').value;
  const ddc = document.getElementById('form-ddc').value;
  const shelf = document.getElementById('form-shelf').value;
  const cover = document.getElementById('form-cover').value;
  const ch1 = document.getElementById('form-ch1').value;
  const ch2 = document.getElementById('form-ch2').value;
  const ch3 = document.getElementById('form-ch3').value;

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const { error } = await supabase.from('books').insert({
    title, slug, author, ddc, shelf_number: shelf, cover_url: cover,
    chapter1_url: ch1, chapter2_url: ch2, chapter3_url: ch3
  });

  if (error) {
    alert("Gagal menyimpan: " + error.message);
  } else {
    closeBookModal();
    loadAdminBooks();
  }
}

function openBookModal() {
  document.getElementById('admin-book-modal').classList.remove('hidden');
}

function closeBookModal() {
  document.getElementById('admin-book-modal').classList.add('hidden');
}

async function deleteBook(id) {
  if (confirm('Yakin ingin menghapus buku ini?')) {
    await supabase.from('books').delete().eq('id', id);
    loadAdminBooks();
  }
}