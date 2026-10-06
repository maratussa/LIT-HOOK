// 1. Konfigurasi Supabase Client
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Element DOM
const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const adminDashboard = document.getElementById("adminDashboard");
const loginError = document.getElementById("loginError");

// 3. Cek Sesi Saat Halaman Dimuat
window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    console.log("Sesi aktif ditemukan untuk User ID:", session.user.id);
    checkAdminRole(session.user.id);
  }
});

// 4. Form Submit Handler
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Tombol login diklik!");

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (loginError) loginError.classList.add("hidden");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Gagal Authentikasi:", error.message);
      showError(error.message);
      return;
    }

    console.log("Login Berhasil, Data User:", data);

    if (data && data.user) {
      // WAJIB memanggil pengecekan role admin
      await checkAdminRole(data.user.id);
    }
  });
}

// 5. Verifikasi Hak Akses Admin di Tabel admin_profiles
async function checkAdminRole(userId) {
  console.log("Memulai verifikasi admin_profiles untuk ID:", userId);

  const { data, error } = await supabaseClient
    .from("admin_profiles")
    .select("role")
    .eq("auth_user_id", userId)
    .single();

  if (error) {
    console.error("Error Query Database:", error.message);
    showError("Akses Ditolak: User ID Anda tidak ditemukan di tabel admin_profiles.");
    return;
  }

  if (!data || data.role !== "admin") {
    console.warn("User terdaftar tapi role bukan admin:", data);
    showError("Akses Ditolak: Akun Anda bukan administrator.");
    return;
  }

  console.log("Verifikasi Berhasil! Membuka Dashboard Admin...");

  // Buka Halaman Admin
  if (loginSection) loginSection.classList.add("hidden");
  if (adminDashboard) adminDashboard.classList.remove("hidden");
}

function showError(msg) {
  if (loginError) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
  } else {
    alert(msg);
  }
}

// 6. Handle Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
  });
}

// Ganti bagian akhir fungsi checkAdminRole di admin.js menjadi seperti ini:
console.log("Verifikasi Berhasil! Membuka Dashboard Admin...");

if (loginSection) {
  loginSection.classList.add("hidden");
  loginSection.style.display = "none"; // Memastikan form login hilang
}

if (adminDashboard) {
  adminDashboard.classList.remove("hidden");
  adminDashboard.style.display = "block"; // Memastikan dashboard admin tampil
}
