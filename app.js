const supabaseUrl = 'https://uynzvfiijhuytgjoaaoi.supabase.co'; 
const supabaseKey = 'sb_publishable_SCzdlhWZGxDYtFL8GTc8MA_H6iSup8-'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let selectedCourseName = ""; 

// ==========================================
// 1. GLOBAL FUNCTIONS (เรียกใช้จาก HTML ได้ทันที)
// ==========================================

window.openEditUserModal = function(email, fullname) {
    const idInput = document.getElementById('editUserId');
    const nameInput = document.getElementById('editFullname');
    const passInput = document.getElementById('editPassword');
    if (idInput && nameInput) {
        idInput.value = email; // ใช้ email เป็น reference แทน id
        nameInput.value = fullname;
        if (passInput) passInput.value = '';
        const modalElement = document.getElementById('editUserModal');
        if (modalElement) new bootstrap.Modal(modalElement).show();
    }
};

window.deleteUser = async (email) => {
    if (confirm(`ยืนยันการลบสมาชิก: ${email}?`)) {
        const { error } = await supabaseClient.from('users').delete().eq('email', email);
        if (!error) { 
            alert("ลบข้อมูลเรียบร้อย");
            location.reload(); 
        }
    }
};

window.deleteCourse = async (id) => {
    if (confirm("ยืนยันการลบ?")) {
        const { error } = await supabaseClient.from('courses').delete().eq('id', id);
        if (!error) location.reload();
    }
};

window.enrollCourse = function(courseName) {
    const userJson = localStorage.getItem('user');
    const loggedInUser = userJson ? JSON.parse(userJson) : null;
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

// ==========================================
// 2. MAIN LOGIC (ทำงานเมื่อโหลดหน้าเว็บ)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    const loggedInUser = userJson ? JSON.parse(userJson) : null;
    
    // Elements
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navUserDropdown = document.getElementById('navUserDropdown');
    const navWelcome = document.getElementById('navWelcome');
    const navAdmin = document.getElementById('navAdmin');
    const navLogoutAction = document.getElementById('navLogoutAction');
    const searchInput = document.getElementById('searchInput');

    // --- จัดการ Auth และ Navbar ---
    if (loggedInUser) {
        if (navLogin) navLogin.classList.add('d-none');
        if (navRegister) navRegister.classList.add('d-none');
        if (navUserDropdown) {
            navUserDropdown.classList.remove('d-none');
            navWelcome.textContent = `คุณ ${loggedInUser.fullname}`;
        }
        if (loggedInUser.role === 'admin' && navAdmin) {
            navAdmin.classList.remove('d-none');
        }
        if (navLogoutAction) {
            navLogoutAction.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
        const myCoursesModal = document.getElementById('myCoursesModal');
        if (myCoursesModal) {
            myCoursesModal.addEventListener('show.bs.modal', loadMyCourses);
        }
    }

    // --- ระบบค้นหาคอร์ส ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCourses(e.target.value.toLowerCase());
        });
    }

    // --- ฟังก์ชันหลัก ---

    async function filterCourses(term) {
        const coursesGrid = document.getElementById('coursesGrid');
        if (!coursesGrid) return;
        const { data } = await supabaseClient.from('courses').select('*');
        if (data) {
            const filtered = data.filter(course => course.course_name.toLowerCase().includes(term));
            renderCourses(filtered);
        }
    }

    function renderCourses(courses) {
        const coursesGrid = document.getElementById('coursesGrid');
        if (courses.length > 0) {
            coursesGrid.innerHTML = courses.map(course => `
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
        } else {
            coursesGrid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><h4>ไม่พบคอร์สเรียน</h4></div>`;
        }
    }

    async function loadMyCourses() {
        const listContainer = document.getElementById('myCoursesList');
        if (!listContainer || !loggedInUser) return;
        const { data } = await supabaseClient.from('enrollments').select('course_name, enroll_date').eq('email', loggedInUser.email);
        if (data && data.length > 0) {
            listContainer.innerHTML = data.map(item => `
                <li class="list-group-item py-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-primary">${item.course_name}</div>
                        <small class="text-muted">วันที่สมัคร: ${new Date(item.enroll_date).toLocaleDateString('th-TH')}</small>
                    </div>
                    <a href="https://meet.google.com/landing" target="_blank" class="btn btn-sm btn-success rounded-pill">เข้าเรียน</a>
                </li>`).join('');
        } else {
            listContainer.innerHTML = '<li class="list-group-item text-center">คุณยังไม่ได้สมัครคอร์สใดๆ</li>';
        }
    }

    // --- ส่วนงาน Admin ---

    async function loadCoursesAdmin() {
        const tableBody = document.getElementById('courseManageTableBody');
        if (!tableBody) return;
        const { data } = await supabaseClient.from('courses').select('*').order('created_at', {ascending: false});
        if (data) {
            tableBody.innerHTML = data.map(c => `
                <tr>
                    <td class="ps-3">${c.id}</td>
                    <td>${c.course_name}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-danger" onclick="deleteCourse(${c.id})">ลบ</button>
                    </td>
                </tr>`).join('');
        }
    }

    async function loadRegisteredUsers() {
        const body = document.getElementById('userTableBody');
        if (!body) return;
        // เรียงตาม created_at แทน id เพราะ id ในตารางคุณเป็น UUID หรือไม่มีอยู่จริง
        const { data } = await supabaseClient.from('users').select('*').order('created_at', { ascending: false });
        if (data) {
            document.getElementById('userCount').innerText = `${data.length} คน`;
            body.innerHTML = data.map((u) => `
                <tr>
                    <td class="ps-3 small text-muted">${u.username}</td>
                    <td><div class="fw-bold">${u.fullname}</div></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-info'}">${u.role}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-warning me-1" onclick="openEditUserModal('${u.email}', '${u.fullname}')">แก้ไข</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.email}')">ลบ</button>
                    </td>
                </tr>`).join('');
        }
    }

    async function loadEnrollments() {
        const body = document.getElementById('enrollmentTableBody');
        if (!body) return;
        const { data } = await supabaseClient.from('enrollments').select('*').order('enroll_date', {ascending: false});
        if (data) {
            body.innerHTML = data.map(e => `
                <tr>
                    <td class="ps-3">${e.fullname}</td>
                    <td>${e.email}</td>
                    <td><span class="badge bg-light text-primary border">${e.course_name}</span></td>
                    <td>${new Date(e.enroll_date).toLocaleString('th-TH')}</td>
                </tr>`).join('');
        }
    }

    // --- ฟอร์ม Admin ---

    const courseForm = document.getElementById('courseManageForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('inputCourseName').value;
            const { error } = await supabaseClient.from('courses').insert([{ course_name: name }]);
            if (!error) { 
                alert("เพิ่มสำเร็จ"); 
                location.reload(); 
            }
        });
    }

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('editUserId').value;
            const newFullname = document.getElementById('editFullname').value;
            const newPassword = document.getElementById('editPassword').value;
            let updateData = { fullname: newFullname };
            if (newPassword !== "") updateData.password = newPassword;

            const { error } = await supabaseClient.from('users').update(updateData).eq('email', email);
            if (!error) {
                alert("อัปเดตข้อมูลสำเร็จ!");
                location.reload();
            }
        });
    }

    window.confirmEnroll = async function() {
        const phone = document.getElementById('modalUserPhone').value;
        if (!phone) { alert("กรุณากรอกเบอร์โทรศัพท์"); return; }
        const { error } = await supabaseClient.from('enrollments').insert([{ 
            course_name: selectedCourseName,
            fullname: loggedInUser.fullname,
            email: loggedInUser.email,
            phone: phone
        }]);
        if (!error) {
            alert("ลงทะเบียนสำเร็จ!");
            location.reload();
        }
    };

    // เช็คหน้า Admin
    if (window.location.pathname.includes('admin.html')) {
        if (!loggedInUser || loggedInUser.role !== 'admin') {
            window.location.href = 'index.html';
        } else {
            loadCoursesAdmin();
            loadEnrollments();
            loadRegisteredUsers();
        }
    }

    // โหลดคอร์สหน้าแรก
    if (document.getElementById('coursesGrid')) filterCourses(""); 
});const supabaseUrl = 'https://uynzvfiijhuytgjoaaoi.supabase.co'; 
const supabaseKey = 'sb_publishable_SCzdlhWZGxDYtFL8GTc8MA_H6iSup8-'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let selectedCourseName = ""; 

// ==========================================
// 1. GLOBAL FUNCTIONS (เรียกใช้จาก HTML ได้ทันที)
// ==========================================

window.openEditUserModal = function(email, fullname) {
    const idInput = document.getElementById('editUserId');
    const nameInput = document.getElementById('editFullname');
    const passInput = document.getElementById('editPassword');
    if (idInput && nameInput) {
        idInput.value = email; // ใช้ email เป็น reference แทน id
        nameInput.value = fullname;
        if (passInput) passInput.value = '';
        const modalElement = document.getElementById('editUserModal');
        if (modalElement) new bootstrap.Modal(modalElement).show();
    }
};

window.deleteUser = async (email) => {
    if (confirm(`ยืนยันการลบสมาชิก: ${email}?`)) {
        const { error } = await supabaseClient.from('users').delete().eq('email', email);
        if (!error) { 
            alert("ลบข้อมูลเรียบร้อย");
            location.reload(); 
        }
    }
};

window.deleteCourse = async (id) => {
    if (confirm("ยืนยันการลบ?")) {
        const { error } = await supabaseClient.from('courses').delete().eq('id', id);
        if (!error) location.reload();
    }
};

window.enrollCourse = function(courseName) {
    const userJson = localStorage.getItem('user');
    const loggedInUser = userJson ? JSON.parse(userJson) : null;
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

// ==========================================
// 2. MAIN LOGIC (ทำงานเมื่อโหลดหน้าเว็บ)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    const loggedInUser = userJson ? JSON.parse(userJson) : null;
    
    // Elements
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navUserDropdown = document.getElementById('navUserDropdown');
    const navWelcome = document.getElementById('navWelcome');
    const navAdmin = document.getElementById('navAdmin');
    const navLogoutAction = document.getElementById('navLogoutAction');
    const searchInput = document.getElementById('searchInput');

    // --- จัดการ Auth และ Navbar ---
    if (loggedInUser) {
        if (navLogin) navLogin.classList.add('d-none');
        if (navRegister) navRegister.classList.add('d-none');
        if (navUserDropdown) {
            navUserDropdown.classList.remove('d-none');
            navWelcome.textContent = `คุณ ${loggedInUser.fullname}`;
        }
        if (loggedInUser.role === 'admin' && navAdmin) {
            navAdmin.classList.remove('d-none');
        }
        if (navLogoutAction) {
            navLogoutAction.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
        const myCoursesModal = document.getElementById('myCoursesModal');
        if (myCoursesModal) {
            myCoursesModal.addEventListener('show.bs.modal', loadMyCourses);
        }
    }

    // --- ระบบค้นหาคอร์ส ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCourses(e.target.value.toLowerCase());
        });
    }

    // --- ฟังก์ชันหลัก ---

    async function filterCourses(term) {
        const coursesGrid = document.getElementById('coursesGrid');
        if (!coursesGrid) return;
        const { data } = await supabaseClient.from('courses').select('*');
        if (data) {
            const filtered = data.filter(course => course.course_name.toLowerCase().includes(term));
            renderCourses(filtered);
        }
    }

    function renderCourses(courses) {
        const coursesGrid = document.getElementById('coursesGrid');
        if (courses.length > 0) {
            coursesGrid.innerHTML = courses.map(course => `
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
        } else {
            coursesGrid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><h4>ไม่พบคอร์สเรียน</h4></div>`;
        }
    }

    async function loadMyCourses() {
        const listContainer = document.getElementById('myCoursesList');
        if (!listContainer || !loggedInUser) return;
        const { data } = await supabaseClient.from('enrollments').select('course_name, enroll_date').eq('email', loggedInUser.email);
        if (data && data.length > 0) {
            listContainer.innerHTML = data.map(item => `
                <li class="list-group-item py-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-primary">${item.course_name}</div>
                        <small class="text-muted">วันที่สมัคร: ${new Date(item.enroll_date).toLocaleDateString('th-TH')}</small>
                    </div>
                    <a href="https://meet.google.com/landing" target="_blank" class="btn btn-sm btn-success rounded-pill">เข้าเรียน</a>
                </li>`).join('');
        } else {
            listContainer.innerHTML = '<li class="list-group-item text-center">คุณยังไม่ได้สมัครคอร์สใดๆ</li>';
        }
    }

    // --- ส่วนงาน Admin ---

    async function loadCoursesAdmin() {
        const tableBody = document.getElementById('courseManageTableBody');
        if (!tableBody) return;
        const { data } = await supabaseClient.from('courses').select('*').order('created_at', {ascending: false});
        if (data) {
            tableBody.innerHTML = data.map(c => `
                <tr>
                    <td class="ps-3">${c.id}</td>
                    <td>${c.course_name}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-danger" onclick="deleteCourse(${c.id})">ลบ</button>
                    </td>
                </tr>`).join('');
        }
    }

    async function loadRegisteredUsers() {
        const body = document.getElementById('userTableBody');
        if (!body) return;
        // เรียงตาม created_at แทน id เพราะ id ในตารางคุณเป็น UUID หรือไม่มีอยู่จริง
        const { data } = await supabaseClient.from('users').select('*').order('created_at', { ascending: false });
        if (data) {
            document.getElementById('userCount').innerText = `${data.length} คน`;
            body.innerHTML = data.map((u) => `
                <tr>
                    <td class="ps-3 small text-muted">${u.username}</td>
                    <td><div class="fw-bold">${u.fullname}</div></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-info'}">${u.role}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-warning me-1" onclick="openEditUserModal('${u.email}', '${u.fullname}')">แก้ไข</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.email}')">ลบ</button>
                    </td>
                </tr>`).join('');
        }
    }

    async function loadEnrollments() {
        const body = document.getElementById('enrollmentTableBody');
        if (!body) return;
        const { data } = await supabaseClient.from('enrollments').select('*').order('enroll_date', {ascending: false});
        if (data) {
            body.innerHTML = data.map(e => `
                <tr>
                    <td class="ps-3">${e.fullname}</td>
                    <td>${e.email}</td>
                    <td><span class="badge bg-light text-primary border">${e.course_name}</span></td>
                    <td>${new Date(e.enroll_date).toLocaleString('th-TH')}</td>
                </tr>`).join('');
        }
    }

    // --- ฟอร์ม Admin ---

    const courseForm = document.getElementById('courseManageForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('inputCourseName').value;
            const { error } = await supabaseClient.from('courses').insert([{ course_name: name }]);
            if (!error) { 
                alert("เพิ่มสำเร็จ"); 
                location.reload(); 
            }
        });
    }

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('editUserId').value;
            const newFullname = document.getElementById('editFullname').value;
            const newPassword = document.getElementById('editPassword').value;
            let updateData = { fullname: newFullname };
            if (newPassword !== "") updateData.password = newPassword;

            const { error } = await supabaseClient.from('users').update(updateData).eq('email', email);
            if (!error) {
                alert("อัปเดตข้อมูลสำเร็จ!");
                location.reload();
            }
        });
    }

    window.confirmEnroll = async function() {
        const phone = document.getElementById('modalUserPhone').value;
        if (!phone) { alert("กรุณากรอกเบอร์โทรศัพท์"); return; }
        const { error } = await supabaseClient.from('enrollments').insert([{ 
            course_name: selectedCourseName,
            fullname: loggedInUser.fullname,
            email: loggedInUser.email,
            phone: phone
        }]);
        if (!error) {
            alert("ลงทะเบียนสำเร็จ!");
            location.reload();
        }
    };

    // เช็คหน้า Admin
    if (window.location.pathname.includes('admin.html')) {
        if (!loggedInUser || loggedInUser.role !== 'admin') {
            window.location.href = 'index.html';
        } else {
            loadCoursesAdmin();
            loadEnrollments();
            loadRegisteredUsers();
        }
    }

    // โหลดคอร์สหน้าแรก
    if (document.getElementById('coursesGrid')) filterCourses(""); 
});
