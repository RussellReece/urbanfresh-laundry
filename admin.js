// GANTI DENGAN URL APPS SCRIPT ANDA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzb0Qf0e4csapIHMz5CF3gG387ebd_HOuEbxy8cVkQjZPzXdZvUD8I32VgDfY7FbAX3/exec"; 

// --- GLOBAL VARIABLES ---
let globalB2CData = [];
let globalB2BData = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchAllData();
    setInterval(fetchAllData, 5000); 
});

// --- FETCH DATA ---
function fetchAllData() {
    fetch(`${APPS_SCRIPT_URL}?action=getAllData`)
    .then(response => response.json())
    .then(data => {
        globalB2CData = data.b2c;
        globalB2BData = data.b2b;

        renderTableB2C(data.b2c);
        renderTableB2B(data.b2b);
        calculateSummary(data.b2c, data.b2b);

        // === LOGIKA ANTRIAN GABUNGAN ===
        const pendingB2C = data.b2c
            .filter(o => o.status === "Menunggu Konfirmasi")
            .map(o => ({...o, type: 'B2C'}));

        const pendingB2B = data.b2b
            .filter(o => o.status === "Menunggu Konfirmasi")
            .map(o => ({...o, type: 'B2B'}));

        const allPending = [...pendingB2C, ...pendingB2B];

        // Urutkan berdasarkan Waktu (ID timestamp)
        allPending.sort((a, b) => {
            const timeA = parseInt(a.id.split('-')[1]);
            const timeB = parseInt(b.id.split('-')[1]);
            return timeA - timeB; 
        });

        if (allPending.length > 0) {
            const priorityOrder = allPending[0]; 
            if (priorityOrder.type === 'B2C') renderCardB2C(priorityOrder);
            else renderCardB2B(priorityOrder);
        } else {
            document.getElementById('newOrderCardContainer').innerHTML = `
                <div class="order-card card-empty">
                    <div class="empty-text">Tidak ada pesanan<br>baru yang perlu<br>dikonfirmasi</div>
                </div>`;
        }
    })
    .catch(err => console.error("Error fetching data:", err));
}

// ==========================================
// HELPER: WARNA PAKET DINAMIS
// ==========================================
function getPackageClass(pkgName) {
    if (!pkgName) return "pkg-standard"; // Default
    const p = pkgName.toLowerCase();

    // B2C Packages
    if (p.includes("express")) return "pkg-express";
    if (p.includes("premium")) return "pkg-premium";
    
    // B2B Packages
    if (p.includes("gold")) return "pkg-gold";
    if (p.includes("platinum")) return "pkg-platinum";
    if (p.includes("silver")) return "pkg-silver";

    return "pkg-standard"; // Default (Standard)
}

// --- RENDER CARD B2C (UPDATED) ---
function renderCardB2C(order) {
    const container = document.getElementById('newOrderCardContainer');
    // Ambil kelas warna berdasarkan nama paket
    const packageClass = getPackageClass(order.package);

    // Fitur List
    const packageDetails = {
        "Standard": ["Layanan Dasar", "Deterjen Standar", "Estimasi 3 Hari"],
        "Express": ["Layanan Prioritas", "Deterjen Premium", "Estimasi 1 Hari"],
        "Premium": ["Perawatan Khusus", "Deterjen Eco-Friendly", "Estimasi 6 Jam"]
    };
    const currentFeatures = packageDetails[order.package] || packageDetails["Standard"];
    const featuresHTML = currentFeatures.map(item => `<li>${item}</li>`).join("");

    container.innerHTML = `
        <div class="order-card card-b2c">
            <div class="card-header">
                <div class="card-icon-circle"><i class="fa-solid fa-sparkles"></i></div>
                <div class="card-title">UrbanFresh ${order.service}</div>
                <span class="badge-new">New</span>
            </div>
            <div class="customer-name">${order.name}<a href="https://wa.me/${order.phone}" target="_blank" class="chat-btn"><i class="fa-brands fa-whatsapp"></i> Chat Customer</a></div>
            <div class="card-info-row"><i class="fa-solid fa-location-dot"></i><span>${order.address}</span></div>
            <span class="timestamp-text"><i class="fa-regular fa-clock"></i> ${order.timestamp}</span>
            <ul class="b2c-features">${featuresHTML}</ul>
            <div class="bottom-labels"><span class="label-text">Jenis Layanan :</span><span class="label-text">Paket :</span></div>
            
            <div class="values-container">
                <div class="value-box b2c-box-blue">${order.service}</div>
                <div class="value-box ${packageClass}">${order.package}</div>
            </div>
            
            <button class="btn-confirm btn-blue" onclick="confirmOrder('${order.id}', 'B2C')">Konfirmasi</button>
        </div>
    `;
}

// --- RENDER CARD B2B (UPDATED) ---
function renderCardB2B(order) {
    const container = document.getElementById('newOrderCardContainer');
    // Ambil kelas warna berdasarkan nama paket
    const packageClass = getPackageClass(order.package);

    container.innerHTML = `
        <div class="order-card card-b2b">
            <div class="card-header">
                <div class="card-icon-circle"><i class="fa-solid fa-building"></i></div>
                <div class="card-title">UrbanFresh Corporate</div>
                <span class="badge-new">New</span>
            </div>
            <div class="customer-name" style="font-size:18px;">${order.company}<span style="font-size:14px; font-weight:400;">PIC : ${order.pic}</span></div>
            <div class="card-info-row"><i class="fa-solid fa-location-dot"></i><span>${order.address}</span></div>
            <span class="timestamp-text"><i class="fa-regular fa-clock"></i> ${order.timestamp}</span>
            <p class="b2b-message">"${order.message}"</p>
            <div class="bottom-labels"><span class="label-text">Estimate Weight :</span><span class="label-text">Paket :</span></div>
            
            <div class="values-container">
                <div class="value-box b2b-box-green">${order.weight}</div>
                <div class="value-box ${packageClass}">${order.package}</div>
            </div>
            
            <button class="btn-confirm btn-teal" onclick="confirmOrder('${order.id}', 'B2B')">Konfirmasi</button>
        </div>
    `;
}

// --- FUNGSI CONFIRM & LAINNYA (TETAP) ---
function confirmOrder(id, type) {
    let newStatus = "Menunggu Penjemputan"; 
    let confirmMsg = "Konfirmasi pesanan ini? Status akan diubah menjadi 'Menunggu Penjemputan'.";

    if (type === 'B2B') {
        newStatus = "Sedang Ditinjau";
        confirmMsg = "Konfirmasi proposal ini? Status akan diubah menjadi 'Sedang Ditinjau'.";
    }

    if(!confirm(confirmMsg)) return;
    
    const btn = document.querySelector('.btn-confirm');
    if(btn) { btn.innerText = "Memproses..."; btn.disabled = true; }
    
    fetch(`${APPS_SCRIPT_URL}?action=updateStatus&id=${id}&type=${type}&status=${encodeURIComponent(newStatus)}`)
    .then(res => res.json())
    .then(data => {
        if(data.result === "success") { fetchAllData(); }
        else { alert("Gagal update status."); if(btn) { btn.innerText = "Konfirmasi"; btn.disabled = false; } }
    })
    .catch(err => { alert("Gagal koneksi server."); if(btn) { btn.innerText = "Konfirmasi"; btn.disabled = false; } });
}

// --- SISA FUNGSI (Render Table, Modal, Delete, Summary) ---
// (Dicopy sama persis agar file tidak terpotong)

function renderTableB2C(data) {
    const tbody = document.getElementById('tbodyB2C');
    tbody.innerHTML = "";
    data.forEach(item => {
        let statusClass = "status-selesai"; 
        const s = item.status.toLowerCase();
        if(s.includes("menunggu") || s.includes("proses") || s.includes("sedang") || s.includes("siap") || s.includes("kurir")) statusClass = "status-pending";
        if(s.includes("batal")) statusClass = "status-batal";
        const linkUrl = (item.locationLink && item.locationLink !== "-") ? item.locationLink : "#";
        const linkTarget = (linkUrl !== "#") ? "_blank" : "_self";
        const addressText = item.address || "No Address";
        const row = 
        `<tr>
            <td>${item.name}</td>
            <td>${item.phone}</td>
            <td>
                <span 
                style="background:#eee; 
                padding:2px 8px; 
                border-radius:4px;">${item.service}
                </span>
            </td>
            <td>
                <span 
                style="background:#e0f7fa; 
                color:#006064; 
                padding:2px 8px; 
                border-radius:4px;">${item.package}
                </span>
            </td>
            <td><span class="status-badge ${statusClass}">${item.status}</span></td>
            <td>${item.timestamp}</td>
            <td>
                <a href="${linkUrl}" target="${linkTarget}" class="location-link" title="${linkUrl}">${addressText}</a>
            </td>
            <td>
                <button class="btn-action btn-edit" onclick="openEditModalB2C('${item.id}')">Edit</button>
                <button class="btn-action btn-delete" onclick="deleteOrder('${item.id}', 'B2C')">
                    <i class="fa-solid fa-trash"></i> 
                </button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function renderTableB2B(data) {
    const tbody = document.getElementById('tbodyB2B');
    tbody.innerHTML = "";
    data.forEach(item => {
        let statusClass = "status-selesai";
        const s = item.status.toLowerCase();
        if(s.includes("menunggu") || s.includes("negosiasi") || s.includes("tinjau") || s.includes("survey")) statusClass = "status-pending";
        if(s.includes("batal") || s.includes("tolak")) statusClass = "status-batal";
        const addressText = item.address || "No Address";
        const mapSearchLink = item.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}` : "#";
        const linkTarget = (mapSearchLink !== "#") ? "_blank" : "_self";
        const row = 
        `<tr>
            <td title="${item.company}">${item.company}</td>
            <td title="${item.pic}">${item.pic}</td>
            <td title="${item.email}">${item.email}</td>
            <td title="${item.phone}">${item.phone}</td>
            <td title="${item.industry}">${item.industry}</td>
            <td title="${item.weight}">${item.weight}</td>
            <td>
                <span 
                style="background:#495057; 
                color:white; 
                padding:2px 8px; 
                border-radius:4px;">${item.package}</span>
            </td>
            <td><a href="${mapSearchLink}" target="${linkTarget}" class="location-link" title="Cari di Maps">${addressText}</a></td>
            <td><span class="status-badge ${statusClass}">${item.status}</span></td>
            <td>${item.timestamp}</td>
            <td>
                <button class="btn-action btn-edit" onclick="openEditModalB2B('${item.id}')">Edit</button>
                <button class="btn-action btn-delete" onclick="deleteOrder('${item.id}', 'B2B')">
                    <i class="fa-solid fa-trash"></i> 
                </button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function calculateSummary(b2cData, b2bData) {
    const allOrders = [...b2cData, ...b2bData];
    const activeCount = allOrders.filter(o => o.status !== "Selesai" && o.status !== "Dibatalkan" && o.status !== "Proposal Ditolak").length;
    const cancelledCount = allOrders.filter(o => o.status === "Dibatalkan" || o.status === "Proposal Ditolak").length;
    const delayedCount = allOrders.filter(o => o.status === "Menunggu Konfirmasi" || o.status === "Menunggu Penjemputan" || o.status === "Sedang Ditinjau").length;
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7); 
    const completedThisWeek = allOrders.filter(o => {
        if (o.status !== "Selesai") return false;
        try {
            const datePart = o.timestamp.split(',')[0]; 
            const [day, month, year] = datePart.split('/'); 
            const orderDate = new Date(`${year}-${month}-${day}`); 
            return orderDate >= oneWeekAgo;
        } catch (e) { return false; }
    }).length;
    const totalB2CCompleted = b2cData.filter(o => o.status === "Selesai").length;
    document.getElementById('valActive').innerText = activeCount;
    document.getElementById('valCompleted').innerText = completedThisWeek; 
    document.getElementById('descCompleted').innerText = `Total Pekerjaan Selesai : ${totalB2CCompleted} pekerjaan`;
    document.getElementById('valDelayed').innerText = delayedCount;
    document.getElementById('valCancelled').innerText = cancelledCount;
}

function openEditModalB2C(id) {
    const data = globalB2CData.find(item => item.id === id);
    if (!data) return;
    document.getElementById('editB2C_id_display').value = data.id || "";
    document.getElementById('editB2C_timestamp').value = data.timestamp || "";
    document.getElementById('editB2C_name').value = data.name;
    document.getElementById('editB2C_phone').value = data.phone;
    document.getElementById('editB2C_liveloclink').value = data.locationLink || "-";
    document.getElementById('editB2C_address').value = data.address;
    document.getElementById('editB2C_service').value = data.service;
    document.getElementById('editB2C_package').value = data.package;
    document.getElementById('editB2C_status').value = data.status;
    document.getElementById('modalEditB2C').style.display = 'flex';
}

function openEditModalB2B(id) {
    const data = globalB2BData.find(item => item.id === id);
    if (!data) return;
    document.getElementById('editB2B_id_display').value = data.id || "";
    document.getElementById('editB2B_timestamp').value = data.timestamp || "";
    document.getElementById('editB2B_company').value = data.company;
    document.getElementById('editB2B_pic').value = data.pic;
    document.getElementById('editB2B_email').value = data.email;
    document.getElementById('editB2B_phone').value = data.phone;
    document.getElementById('editB2B_address').value = data.address;
    document.getElementById('editB2B_industry').value = data.industry;
    document.getElementById('editB2B_weight').value = data.weight;
    document.getElementById('editB2B_package').value = data.package;
    document.getElementById('editB2B_status').value = data.status;
    document.getElementById('editB2B_message').value = data.message;
    document.getElementById('modalEditB2B').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function handleUpdateB2C(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Menyimpan..."; btn.disabled = true;
    const payload = {
        type: "B2C",
        id: document.getElementById('editB2C_id_display').value,
        name: document.getElementById('editB2C_name').value,
        phone: document.getElementById('editB2C_phone').value,
        email: document.getElementById('editB2C_liveloclink').value, 
        address: document.getElementById('editB2C_address').value,
        service: document.getElementById('editB2C_service').value,
        package: document.getElementById('editB2C_package').value,
        status: document.getElementById('editB2C_status').value
    };
    sendUpdate(payload, 'modalEditB2C', btn, originalText);
}

function handleUpdateB2B(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Menyimpan..."; btn.disabled = true;
    const payload = {
        type: "B2B",
        id: document.getElementById('editB2B_id_display').value,
        company: document.getElementById('editB2B_company').value,
        pic: document.getElementById('editB2B_pic').value,
        email: document.getElementById('editB2B_email').value,
        phone: document.getElementById('editB2B_phone').value,
        address: document.getElementById('editB2B_address').value,
        industry: document.getElementById('editB2B_industry').value,
        weight: document.getElementById('editB2B_weight').value,
        package: document.getElementById('editB2B_package').value,
        status: document.getElementById('editB2B_status').value,
        message: document.getElementById('editB2B_message').value
    };
    sendUpdate(payload, 'modalEditB2B', btn, originalText);
}

function sendUpdate(payload, modalId, btn, btnText) {
    fetch(`${APPS_SCRIPT_URL}?action=updateData`, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.result === "success") {
            alert("Data berhasil diperbarui!");
            closeModal(modalId);
            fetchAllData(); 
        } else {
            alert("Gagal update data.");
        }
    })
    .catch(err => alert("Error koneksi."))
    .finally(() => {
        btn.innerText = btnText;
        btn.disabled = false;
    });
}

function deleteOrder(id, type) {
    if(!confirm("Yakin ingin menghapus data ini secara permanen?")) return;
    fetch(`${APPS_SCRIPT_URL}?action=deleteOrder&id=${id}&type=${type}`)
    .then(res => res.json())
    .then(data => {
        if(data.result === "success") { alert("Data berhasil dihapus."); fetchAllData(); }
        else { alert("Gagal menghapus data."); }
    })
    .catch(err => alert("Error koneksi."));
}

// --- FUNGSI GANTI TAB (DENGAN TRANSISI WARNA) ---
function switchTab(type) {
    // 1. Atur Tombol Aktif
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        // Hapus active dari semua, lalu tambahkan ke yang diklik
        if (btn.textContent.includes(type)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Ganti Tampilan Tabel
    if (type === 'B2C') {
        document.getElementById('tableB2C').style.display = 'table';
        document.getElementById('tableB2B').style.display = 'none';
        
        // Hapus mode B2B (Kembali ke Biru B2C)
        document.querySelector('.table-tabs').classList.remove('b2b-mode');
        
    } else {
        document.getElementById('tableB2C').style.display = 'none';
        document.getElementById('tableB2B').style.display = 'table';
        
        // Tambah mode B2B (Berubah jadi Gelap/Teal)
        document.querySelector('.table-tabs').classList.add('b2b-mode');
    }
}