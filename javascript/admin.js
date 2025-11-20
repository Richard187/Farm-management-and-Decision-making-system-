document.addEventListener('DOMContentLoaded', function() {
    updateHeaderAuthState();
    if (!requireAdmin()) return;
    renderAdmin();
});

function renderAdmin() {
    const users = getUsers();
    const farmers = users.filter(u => u.role === 'farmer');
    const loggedIds = getLoggedInUsers();
    const recent = farmers.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const admin = users.find(u => u.role === 'admin');
    const types = {};
    farmers.forEach(f => {
        const t = (f.farmType || 'Unknown').trim();
        types[t] = (types[t] || 0) + 1;
    });
    const distinctTypes = Object.keys(types).length;
    setText('registeredFarmers', farmers.length);
    setText('loggedInFarmers', loggedIds.length);
    setText('adminEmail', admin ? admin.email : 'admin');
    setText('farmTypeCount', distinctTypes);
    const rs = document.getElementById('recentSignup');
    if (rs && recent) {
        rs.innerHTML = '<i class="fas fa-user-plus"></i> Last: ' + recent.firstName + ' ' + recent.lastName;
    }
    renderFarmerTable(farmers);
    renderFarmTypeList(types);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}

function renderFarmerTable(farmers) {
    const tbody = document.querySelector('#farmerTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    farmers.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = [
            f.firstName + ' ' + f.lastName,
            f.email,
            f.phone,
            f.farmType,
            f.farmSize,
            formatDate(f.createdAt),
            f.lastLogin ? formatDate(f.lastLogin) : '—'
        ].map(v => '<td style="padding:8px; border-bottom:1px solid #eee;">' + v + '</td>').join('');
        tbody.appendChild(tr);
    });
}

function renderFarmTypeList(types) {
    const container = document.getElementById('farmTypeList');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(types).sort().forEach(k => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.padding = '8px 0';
        div.innerHTML = '<span>' + k + '</span><strong>' + types[k] + '</strong>';
        container.appendChild(div);
    });
}

function formatDate(s) {
    try {
        const d = new Date(s);
        return d.toLocaleString();
    } catch {
        return String(s);
    }
}