const supabaseUrl = 'https://uynzvfiijhuytgjoaaoi.supabase.co'; 
const supabaseKey = 'sb_publishable_SCzdlhWZGxDYtFL8GTc8MA_H6iSup8-'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ตัวแปร Global สำหรับเก็บคอร์สที่เลือก
let selectedCourseName = ""; 

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. จัดการสถานะการเข้าสู่ระบบ (ดึงข้อมูล User ไว้บนสุด) ---
    const userJson = localStorage.getItem('user');
    const loggedInUser = userJson ? JSON.parse(userJson) : null;

    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navLogout = document.getElementById('navLogout');
    const navWelcome = document.getElementById('navWelcome');
    const navAdmin = document.getElementById('navAdmin');

    if (loggedInUser) {
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';
        
        if (navWelcome) {
            navWelcome.style.display = 'block';
            navWelcome.textContent = `คุณ ${loggedInUser.fullname}`;
        }
        if (navLogout) {
            navLogout.style.display = 'block';
            navLogout.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('user');
                alert('ออกจากระบบเรียบร้อยแล้วครับ');
                window.location.href = 'index.html';
            });
        }
        if (loggedInUser.role === 'admin' && navAdmin) {
            navAdmin.style.display = 'block';
        }
    }

    // --- 2. ระบบป้องกันสิทธิ์ ---
    if (window.location.pathname.includes('courses.html') && !loggedInUser) {
        alert('กรุณาเข้าสู่ระบบก่อนสมัครคอร์สเรียนครับ');
        window.location.href = 'login.html';
    }

    if (window.location.pathname.includes('admin.html')) {
        if (!loggedInUser || loggedInUser.role !== 'admin') {
            alert('เฉพาะ Admin เท่านั้นที่เข้าถึงหน้านี้ได้');
            window.location.href = 'index.html';
        } else {
            loadCoursesAdmin();
            loadEnrollments();
            loadRegisteredUsers();
        }
    }

    // --- 3. ระบบสมัครสมาชิก ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('รหัสผ่านไม่ตรงกัน!');
                return;
            }

            const { error } = await supabaseClient
                .from('users')
                .insert([{ email, fullname, username, password, role: 'user' }]);

            if (error) alert('เกิดข้อผิดพลาด: ' + error.message);
            else {
                alert('สมัครสมาชิกสำเร็จ!');
                window.location.href = 'login.html';
            }
        });
    }

    // --- 4. ระบบเข้าสู่ระบบ ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('loginUsername').value;
            const passwordInput = document.getElementById('loginPassword').value;

            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('username', usernameInput)
                .eq('password', passwordInput);

            if (data && data.length > 0) {
                localStorage.setItem('user', JSON.stringify(data[0]));
                alert('เข้าสู่ระบบสำเร็จ!');
                window.location.href = 'index.html'; 
            } else {
                alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        });
    }

    // --- 5. ระบบคอร์สเรียน (หน้า Grid) ---
    window.loadCoursesGrid = async function() {
        const coursesGrid = document.getElementById('coursesGrid');
        if (!coursesGrid) return;

        const { data, error } = await supabaseClient.from('courses').select('*');
        if (data) {
            coursesGrid.innerHTML = data.map(course => `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden">
                        <div class="bg-primary text-white d-flex align-items-center justify-content-center" style="height: 160px; background: linear-gradient(45deg, #0d6efd, #0dcaf0);">
                            <i class="display-3">📖</i>
                        </div>
                        <div class="card-body p-4">
                            <h5 class="card-title fw-bold">${course.course_name}</h5>
                            <button class="btn btn-primary w-100 rounded-pill mt-3" onclick="enrollCourse('${course.course_name}')">ลงทะเบียนเรียน</button>
                        </div>
                    </div>
                </div>`).join('');
        }
    };
    if (document.getElementById('coursesGrid')) loadCoursesGrid();

    // --- 6. ระบบลงทะเบียน (Enrollment) ---
    window.enrollCourse = function(courseName) {
        if (!loggedInUser) {
            alert("กรุณาเข้าสู่ระบบก่อนครับ");
            window.location.href = 'login.html';
            return;
        }
        selectedCourseName = courseName;
        document.getElementById('modalCourseName').value = courseName;
        document.getElementById('modalUserFullname').value = loggedInUser.fullname;
        document.getElementById('modalUserEmail').value = loggedInUser.email;
        new bootstrap.Modal(document.getElementById('enrollModal')).show();
    };

    window.confirmEnroll = async function() {
        const phone = document.getElementById('modalUserPhone').value;
        if (!phone || phone.length < 9) {
            alert("กรุณากรอกเบอร์โทรศัพท์");
            return;
        }

        const { error } = await supabaseClient.from('enrollments').insert([{ 
            user_id: loggedInUser.id, 
            course_name: selectedCourseName,
            fullname: loggedInUser.fullname,
            email: loggedInUser.email,
            phone: phone
        }]);

        if (error) alert(error.message);
        else {
            alert("ลงทะเบียนสำเร็จ!");
            bootstrap.Modal.getInstance(document.getElementById('enrollModal')).hide();
        }
    };

    // --- 7. ส่วนงาน Admin (หน้า admin.html) ---
    async function loadCoursesAdmin() {
        const tableBody = document.getElementById('courseManageTableBody');
        if (!tableBody) return;
        const { data } = await supabaseClient.from('courses').select('*').order('id', {ascending: false});
        if (data) {
            tableBody.innerHTML = data.map(c => `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.course_name}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteCourse(${c.id})">ลบ</button></td>
                </tr>`).join('');
        }
    }

    const courseForm = document.getElementById('courseManageForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('inputCourseName').value;
            const { error } = await supabaseClient.from('courses').insert([{ course_name: name }]);
            if (!error) {
                alert("เพิ่มสำเร็จ");
                document.getElementById('inputCourseName').value = '';
                loadCoursesAdmin();
            }
        });
    }

    window.deleteCourse = async (id) => {
        if (confirm("ยืนยันการลบ?")) {
            await supabaseClient.from('courses').delete().eq('id', id);
            loadCoursesAdmin();
        }
    };

    async function loadRegisteredUsers() {
        const body = document.getElementById('registeredUsersTableBody');
        if (!body) return;
        const { data } = await supabaseClient.from('users').select('*');
        if (data) {
            body.innerHTML = data.map((u, i) => `<tr><td>${i+1}</td><td>${u.fullname}</td><td>${u.email}</td><td>${u.role}</td></tr>`).join('');
        }
    }

    async function loadEnrollments() {
        const body = document.getElementById('enrollmentTableBody');
        if (!body) return;
        const { data } = await supabaseClient.from('enrollments').select('*').order('enroll_date', {ascending: false});
        if (data) {
            body.innerHTML = data.map(e => `<tr><td>${e.fullname}</td><td>${e.email}</td><td>${e.course_name}</td><td>${new Date(e.enroll_date).toLocaleString('th-TH')}</td></tr>`).join('');
        }
    }
});
