// ฟังก์ชันสำหรับอัปเดตสถานะ Navbar (ใช้ได้ทุกหน้า)
function updateNavbar() {
    const loggedInUser = getLoggedInUser();
    
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navUserDropdown = document.getElementById('navUserDropdown');
    const navWelcome = document.getElementById('navWelcome');
    const navAdmin = document.getElementById('navAdmin');

    // ล้างสถานะเดิมก่อน (ป้องกัน UI ค้าง)
    if (navLogin) navLogin.classList.remove('d-none');
    if (navRegister) navRegister.classList.remove('d-none');
    if (navUserDropdown) navUserDropdown.classList.add('d-none');
    if (navAdmin) navAdmin.classList.add('d-none');

    if (loggedInUser) {
        // --- กรณี Login แล้ว ---
        if (navLogin) navLogin.classList.add('d-none');
        if (navRegister) navRegister.classList.add('d-none');
        
        if (navUserDropdown) {
            navUserDropdown.classList.remove('d-none');
            // ใส่ชื่อ Fullname ถ้าไม่มีให้ใช้ Username
            if (navWelcome) navWelcome.textContent = `คุณ ${loggedInUser.fullname || loggedInUser.username}`;
        }
        
        // ตรวจสอบสิทธิ์ Admin (ตัวเล็กตัวใหญ่ต้องตรงกับใน Database)
        if (loggedInUser.role && loggedInUser.role.toLowerCase() === 'admin') {
            if (navAdmin) navAdmin.classList.remove('d-none');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. อัปเดต UI ทันที
    updateNavbar();

    // 2. จัดการฟอร์ม Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // ป้องกันการกดซ้ำระหว่างโหลด
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            const u = document.getElementById('loginUsername').value.trim();
            const p = document.getElementById('loginPassword').value.trim();

            try {
                // ค้นหา User (ใช้ .select().eq() แทน .single() เพื่อป้องกัน Error ถ้าไม่เจอข้อมูล)
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('username', u)
                    .eq('password', p);

                if (error) throw error;

                if (data && data.length > 0) {
                    const userData = data[0];
                    localStorage.setItem('user', JSON.stringify(userData));
                    
                    updateNavbar(); 
                    alert('ยินดีต้อนรับเข้าสู่ระบบ!');
                    
                    // หน่วงเวลาเล็กน้อยก่อนเปลี่ยนหน้า เพื่อให้ LocalStorage บันทึกเสร็จสมบูรณ์
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 100);
                } else {
                    alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                    if (submitBtn) submitBtn.disabled = false;
                }
            } catch (err) {
                console.error("Login System Error:", err.message);
                alert('ระบบขัดข้อง: ' + err.message);
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 3. ระบบ Logout (Event Delegation)
    document.addEventListener('click', (e) => {
        // เช็กทั้ง ID และ Class ที่เกี่ยวข้องกับ Logout
        const logoutTarget = e.target.closest('#navLogout, #navLogoutAction');
        
        if (logoutTarget) {
            e.preventDefault();
            if (confirm('ยืนยันการออกจากระบบ?')) {
                localStorage.removeItem('user');
                sessionStorage.clear(); // ล้างข้อมูลชั่วคราวด้วยเพื่อความปลอดภัย
                updateNavbar();
                window.location.href = 'index.html';
            }
        }
    });
});

// --- ระบบสมัครสมาชิก (Register) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. ดึงค่าจากหน้าจอ (เพิ่ม email)
        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim(); // ดึงค่าอีเมล
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('รหัสผ่านไม่ตรงกัน');
            return;
        }

        try {
            // 2. ส่งข้อมูลไปที่ Supabase (ต้องระบุคอลัมน์ email ด้วย)
            const { error } = await supabaseClient
                .from('users')
                .insert([{
                    fullname: fullname,
                    email: email,       // ส่งค่าอีเมลไปเก็บในฐานข้อมูล
                    username: username,
                    password: password,
                    role: 'user'        // กำหนดบทบาทพื้นฐาน
                }]);

            if (error) throw error;

            alert('สมัครสมาชิกสำเร็จ!');
            window.location.href = 'login.html';

        } catch (err) {
            alert('ไม่สามารถสมัครสมาชิกได้: ' + err.message);
        }
    });
}