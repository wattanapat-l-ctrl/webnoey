document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = getLoggedInUser();
    
    // จัดการ UI Navbar
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navUserDropdown = document.getElementById('navUserDropdown');
    const navWelcome = document.getElementById('navWelcome');
    const navAdmin = document.getElementById('navAdmin');

    if (loggedInUser) {
        if (navLogin) navLogin.classList.add('d-none');
        if (navRegister) navRegister.classList.add('d-none');
        if (navUserDropdown) {
            navUserDropdown.classList.remove('d-none');
            navWelcome.textContent = `คุณ ${loggedInUser.fullname}`;
        }
        if (loggedInUser.role === 'admin' && navAdmin) navAdmin.classList.remove('d-none');
    }

    // ฟังก์ชัน Logout
    window.logout = () => {
        localStorage.removeItem('user');
        alert('ออกจากระบบเรียบร้อยแล้ว');
        window.location.href = 'index.html';
    };

    // ระบบ Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('loginUsername').value;
            const p = document.getElementById('loginPassword').value;
            const { data } = await supabaseClient.from('users').select('*').eq('username', u).eq('password', p);
            if (data && data.length > 0) {
                localStorage.setItem('user', JSON.stringify(data[0]));
                window.location.href = 'index.html';
            } else { alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); }
        });
    }

    // เพิ่มการดักจับทั้งสอง ID เพื่อป้องกันความสับสน
    const logoutBtn = document.getElementById('navLogoutAction') || document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user');
            alert('ออกจากระบบเรียบร้อยแล้ว');
            window.location.href = 'index.html';
        });
    }
});