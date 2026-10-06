// 1. Konfigurasi Supabase (Gunakan nama variabel 'supabaseClient', BUKAN 'supabase')
const SUPABASE_URL = "https://cxjayfxmihczcuhhnszd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amF5ZnhtaWhjemN1aGhuc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODE5ODIsImV4cCI6MjEwNjc1Nzk4Mn0.q-dJ1nippPUD5T9L3N_NgYNnWGpqiw9-uKZNqScC824";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Element DOM
const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const adminDashboard = document.getElementById("adminDashboard");
const loginError = document.getElementById("loginError");

// 3. Fungsi Cek Sesi Login Saat Halaman Dimuat
window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    checkAdminRole(session.user.id);
  }
});

// 4. Handle Form Login

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Tombol login diklik!"); // Track 1

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.log("Error Login:", error.message); // Track 2
      alert("Gagal Login: " + error.message);
      return;
    }

    console.log("Login Berhasil, Data User:", data); // Track 3
    if (data.user) {
      checkAdminRole(data.user.id);
    }
  });
}

// 5. Verifikasi Role Admin di Tabel admin_profiles
// Gantikan fungsi checkAdminRole yang lama dengan kode ini:
async function checkAdminRole(userId) {
  console.log("Mengecek role untuk User ID:", userId);

  const { data, error } = await supabaseClient
    .from("admin_profiles")
    .select("role")
    .eq("auth_user_id", userId)
    .single();

  if (error) {
    console.error("Gagal membaca tabel admin_profiles:", error.message);
    showError("Akses ditolak: Data admin tidak ditemukan di database.");
    await supabaseClient.auth.signOut();
    return;
  }

  if (!data || data.role !== "admin") {
    console.warn("Role pengguna bukan admin:", data);
    showError("Akses ditolak: Akun Anda bukan administrator.");
    await supabaseClient.auth.signOut();
    return;
  }

  console.log("Role admin terverifikasi! Membuka dashboard...");

  // Sembunyikan Form Login & Tampilkan Dashboard Admin
  if (loginSection) loginSection.classList.add("hidden");
  if (adminDashboard) adminDashboard.classList.remove("hidden");
}

function showError(msg) {
  if (loginError) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
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
