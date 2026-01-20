/* --- CORPORATE FORM HANDLER (REAL) --- */
function handleCorporateSubmit(event) {
    event.preventDefault();

    const btn = document.getElementById('btnSubmitCorp');
    const originalText = btn.innerText;

    // 1. Ambil Data dari Input (menggunakan ID yang baru kita buat)
    const company = document.getElementById('corpName').value;
    const pic = document.getElementById('corpPIC').value;
    const email = document.getElementById('corpEmail').value;
    const industry = document.getElementById('corpIndustry').value || "-";
    const weight = document.getElementById('corpWeight').value || "-";
    const phone = document.getElementById('corpPhone').value;
    const message = document.getElementById('corpMessage').value;

    // 2. Mapping Data ke Struktur Spreadsheet (agar sesuai kolom A-G)
    // CustomerName = "Nama PT (PIC: Budi)"
    const combinedName = `${company} (PIC: ${pic})`;
    // Package = "Hotel - >200kg" (Kita gunakan kolom Package untuk info industri)
    const corpPackage = document.getElementById('corpPackage') ? document.getElementById('corpPackage').value : "-";
    const address = document.getElementById('corpAddress') ? document.getElementById('corpAddress').value : "-";
    
    // 3. Loading State
    btn.innerText = "Mengirim...";
    btn.disabled = true;

    // 4. Kirim ke Backend
    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            type: "B2B",
            company: company,
            pic: pic,
            email: email,
            phone: phone,
            industry: industry,
            weight: weight,
            corpPackage: corpPackage, // Kirim Paket
            address: address,         // Kirim Alamat
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === "success") {
            const orderID = data.orderID;
            
            // Alert Sukses
            alert(`Sukses! Proposal terkirim.\n\nOrder ID Anda: ${orderID}\nSilakan cek inbox email ${email} untuk konfirmasi (Cek folder Spam jika tidak ada).`);
            
            // Reset Form
            document.getElementById('corporateForm').reset();
        } else {
            alert("Gagal mengirim data. Coba lagi.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Gagal terhubung ke server.");
    })
    .finally(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

/* --- CONFIGURATION --- */
// GANTI URL INI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_IiGQc9p9995ABKVLAlXaVZGuXbUwy0tSOvPY7O6Dy9VOFnUOmZXN6ZsAyPeFx0kl/exec"; 
const ADMIN_WA = "6288289387132"; // Ganti nomor Admin

// --- MODAL LOGIC ---
const modal = document.getElementById('orderModal');
const serviceSelect = document.getElementById('modalServiceSelect');
const packageSelect = document.getElementById('modalPackageSelect');

// FUNGSI BARU: Buka Modal dengan Deteksi URL
// Parameter 'clickedPackage' adalah paket yang diklik di halaman Services (Standard/Express/Premium)
function openWhatsApp(clickedPackage = "") {
    modal.style.display = 'flex';
    
    // 1. SET PAKET (Berdasarkan kartu yang diklik)
    if (clickedPackage === 'Standard') packageSelect.value = 'Standard';
    else if (clickedPackage === 'Express') packageSelect.value = 'Express';
    else if (clickedPackage === 'Premium') packageSelect.value = 'Premium';
    
    // 2. SET LAYANAN (Berdasarkan URL Parameter dari halaman Home)
    // Ambil data dari URL (contoh: ?service=Dry Cleaning)
    const urlParams = new URLSearchParams(window.location.search);
    const serviceFromUrl = urlParams.get('service');

    if (serviceFromUrl) {
        // Jika ada info di URL, set dropdown layanan sesuai info tersebut
        // Pastikan value di URL sama persis dengan value di <option> HTML
        serviceSelect.value = serviceFromUrl;
    } 
    
    // 3. Fallback/Default
    // Jika layanan masih kosong (misal user langsung buka services.html tanpa klik learn more)
    // Maka default ke Wash & Fold
    if (serviceSelect.value === "") {
        serviceSelect.value = "Wash & Fold";
    }

    
    // Default Layanan ke Wash & Fold jika belum dipilih
    if (serviceSelect.value === "") {
        serviceSelect.value = "Wash & Fold";
    }
}

// 2. Fungsi Tutup Modal
function closeOrderModal() {
    modal.style.display = 'none';
}

// 3. Close modal jika klik di luar box
window.onclick = function(event) {
    if (event.target == modal) {
        closeOrderModal();
    }
}

/* --- SUBMIT ORDER (B2C) --- */
function submitOrder(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btnSubmitOrder');
    const originalText = btn.innerText;
    
    // Ambil data form
    const name = document.getElementById('modalName').value;
    const phone = document.getElementById('modalPhone').value;
    const address = document.getElementById('modalAddress').value; 
    
    // Ambil Layanan dan Paket
    const selectedService = serviceSelect.value;
    const selectedPackage = packageSelect.value;

    btn.innerText = "Memproses...";
    btn.disabled = true;

    // Kirim ke Google Apps Script (Database)
    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            type: "B2C",
            name: name,
            phone: phone,
            address: address, // Data ini masuk ke Kolom I di Spreadsheet
            service: selectedService,
            package: selectedPackage
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === "success") {
            const orderID = data.orderID;
            
            // --- FORMAT PESAN WHATSAPP ---
            // Gunakan \n untuk baris baru agar lebih rapi daripada %0a
            const rawMessage = `Halo UrbanFresh, saya sudah input data di website.\n\n` +
                               `*Order ID: ${orderID}*\n` +
                               `Nama: ${name}\n` +
                               `Alamat: ${address}\n` +
                               `Layanan: ${selectedService}\n` +
                               `Paket: ${selectedPackage}\n\n` +
                               `Mohon diproses segera. Berikut *Share Live Location* saya:`;
            
            // PENTING: encodeURIComponent() menjaga agar simbol '&' pada Wash & Fold tidak memotong pesan
            const waUrl = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(rawMessage)}`;
            
            window.open(waUrl, '_blank');
            closeOrderModal();
            document.getElementById('quickOrderForm').reset();
        } else {
            alert("Terjadi kesalahan sistem.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Gagal terhubung ke server.");
    })
    .finally(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
}
/* --- TRACKING LOGIC (READ & ACTION CENTER) --- */
function performTracking() {
    const inputId = document.getElementById('orderIdInput').value.trim();
    const errorMsg = document.getElementById('error-message');
    const trackBtn = document.querySelector('.track-btn'); 
    
    // Reset UI Error
    errorMsg.style.display = 'none';
    
    if (inputId === "") {
        errorMsg.innerText = "Silakan masukkan Kode Order.";
        errorMsg.style.display = 'block';
        return;
    }

    // Loading State
    const originalBtnText = trackBtn.innerText;
    trackBtn.innerText = "Mencari...";
    trackBtn.disabled = true;

    // Fetch ke Google Sheet via Apps Script
    fetch(`${APPS_SCRIPT_URL}?action=track&id=${inputId}`)
    .then(response => response.json())
    .then(data => {
        if (data.found) {
            // --- 1. UPDATE BAGIAN KANAN (DETAIL PESANAN) ---
            document.getElementById('resName').innerText = data.name;
            document.getElementById('resDate').innerText = data.date;
            
            // Handle status badge color (Opsional: styling tambahan)
            const statusEl = document.getElementById('resStatus');
            statusEl.innerText = data.status;
            
            // --- 2. UPDATE BAGIAN KIRI (ACTION CENTER) ---
            // Ini akan mengganti gambar "Thinking Face" menjadi Tombol Aksi
            
            const waMessage = `Halo UrbanFresh, saya ingin menanyakan status pesanan saya dengan Order ID: *${data.id}*. Mohon bantuannya.`;
            const waLink = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(waMessage)}`;

            const actionsHTML = `
                <div class="track-actions-container" style="text-align: center; animation: fadeIn 0.5s;">
                    <h3 style="color: white; font-family: var(--font-poppins); margin-bottom: 10px;">Butuh Bantuan?</h3>
                    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 25px;">
                        Hubungi admin jika ada kendala atau buat pesanan baru.
                    </p>
                    
                    <a href="${waLink}" target="_blank" class="action-btn btn-wa-help" 
                       style="display:block; background:white; color:var(--primary-blue); padding:12px; border-radius:50px; text-decoration:none; font-weight:600; margin-bottom:15px; transition:0.3s;">
                        <i class="fa-brands fa-whatsapp"></i> Chat Admin
                    </a>

                    <button onclick="location.href='index.html'" class="action-btn btn-reorder" 
                       style="display:block; width:100%; background:transparent; color:white; border:2px solid rgba(255,255,255,0.7); padding:12px; border-radius:50px; cursor:pointer; font-weight:600; font-family:var(--font-poppins);">
                        <i class="fa-solid fa-plus"></i> Buat Pesanan Baru
                    </button>
                </div>
            `;

            // Ganti isi div .track-image dengan tombol
            const leftContainer = document.querySelector('.track-image');
            if(leftContainer) {
                leftContainer.innerHTML = actionsHTML;
            }

            // Tampilkan hasil, sembunyikan input
            document.getElementById('trackInputState').style.display = 'none';
            document.getElementById('trackResultState').style.display = 'block';

        } else {
            // --- DATA TIDAK DITEMUKAN ---
            errorMsg.innerText = "Kode Pesanan tidak ditemukan. Pastikan ID benar (contoh: CO-176...).";
            errorMsg.style.display = 'block';
        }
    })
    .catch(error => {
        console.error("Error:", error);
        errorMsg.innerText = "Gagal mengambil data. Coba refresh halaman.";
        errorMsg.style.display = 'block';
    })
    .finally(() => {
        trackBtn.innerText = originalBtnText;
        trackBtn.disabled = false;
    });
}

// Fungsi Reset (Tombol "Cek Pesanan Lain")
function resetTracking() {
    document.getElementById('trackInputState').style.display = 'block';
    document.getElementById('trackResultState').style.display = 'none';
    document.getElementById('orderIdInput').value = "";
    
    // Kembalikan gambar ilustrasi awal di sebelah kiri
    const leftContainer = document.querySelector('.track-image');
    if(leftContainer) {
        leftContainer.innerHTML = `<img id="trackingIllustration" src="images/Thinking face-bro 1.png" alt="Thinking about laundry">`;
    }
}

// Simulasi Sticky Navbar (Opsional)
window.addEventListener("scroll", function() {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 50) {
        navbar.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    } else {
        navbar.style.boxShadow = "none";
    }
});

// --- MOBILE MENU TOGGLE ---
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}