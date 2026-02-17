// ==========================================
// 1. ตั้งค่าการเชื่อมต่อ Supabase
// ==========================================
const supabaseUrl = 'https://uynzvfiijhuytgjoaaoi.supabase.co'; 
const supabaseKey = 'sb_publishable_SCzdlhWZGxDYtFL8GTc8MA_H6iSup8-'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 2. ระบบ Session และจัดการ Navbar
    // ==========================================
    // ดึงข้อมูลผู้ใช้จาก localStorage
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    // ดึงตัวแปรเมนูต่างๆ จาก Navbar
    // ดึงตัวแปรเมนูต่างๆ จาก Navbar
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navLogout = document.getElementById('navLogout');
    const navWelcome = document.getElementById('navWelcome');
    const navAdmin = document.getElementById('navAdmin'); // เพิ่มตัวแปรปุ่มแอดมิน

    // ตรวจสอบและเปลี่ยนเมนู Navbar ตามสถานะการล็อกอิน
    if (loggedInUser) {
        // ถ้าเข้าสู่ระบบแล้ว ให้ซ่อน เข้าสู่ระบบ/สมัครสมาชิก
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';
        
        // แสดงชื่อผู้ใช้และปุ่มออกจากระบบ
        if (navWelcome) {
            navWelcome.style.display = 'block';
            navWelcome.textContent = `คุณ ${loggedInUser.fullname}`;
        }
        if (navLogout) {
            navLogout.style.display = 'block';
            navLogout.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('loggedInUser'); // ลบข้อมูลล็อกอิน
                alert('ออกจากระบบเรียบร้อยแล้วครับ');
                window.location.href = 'index.html'; // เด้งกลับหน้าหลัก
            });
        }

        // --- ส่วนที่เพิ่มใหม่: ตรวจสอบว่าเป็น Admin หรือไม่ ---
        if (loggedInUser.role === 'admin' && navAdmin) {
            navAdmin.style.display = 'block'; // แสดงปุ่มแอดมินถ้า role เป็น admin
        }
    }

    // ป้องกันคนยังไม่ล็อกอินแอบเข้าหน้าคอร์สเรียน
    if (window.location.pathname.includes('courses.html') && !loggedInUser) {
        alert('กรุณาเข้าสู่ระบบก่อนสมัครคอร์สเรียนครับ');
        window.location.href = 'login.html';
    }

    // ==========================================
    // 3. จัดการหน้าสมัครสมาชิก (register.html)
    // ==========================================
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
                alert('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้งครับ!');
                return;
            }

            const { data, error } = await supabaseClient
                .from('users')
                .insert([{ email, fullname, username, password }]);

            if (error) {
                console.error('Error:', error);
                alert('เกิดข้อผิดพลาด: อีเมล หรือ Username นี้อาจมีผู้ใช้งานแล้วครับ');
            } else {
                alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบครับ');
                window.location.href = 'login.html';
            }
        });
    }

    // ==========================================
    // 4. จัดการหน้าเข้าสู่ระบบ (login.html)
    // ==========================================
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
                localStorage.setItem('loggedInUser', JSON.stringify(data[0]));
                alert(`ยินดีต้อนรับคุณ ${data[0].fullname}`);
                window.location.href = 'courses.html';
            } else {
                alert('Username หรือ Password ไม่ถูกต้องครับ!');
            }
        });
    }

    // ==========================================
    // 5. จัดการหน้าสมัครคอร์สเรียน (courses.html)
    // ==========================================
    // ==========================================
    // จัดการหน้าสมัครคอร์สเรียน (courses.html)
    // ==========================================
    const courseForm = document.getElementById('courseForm');
    const courseSelect = document.getElementById('courseSelect'); // ดึง dropdown
    
    if (courseSelect) {
        // ฟังก์ชันดึงรายชื่อวิชามาใส่ Dropdown
        async function loadCoursesDropdown() {
            const { data, error } = await supabaseClient.from('courses').select('*');
            courseSelect.innerHTML = '<option value="" disabled selected>-- เลือกคอร์สเรียน --</option>';
            if (data) {
                data.forEach(course => {
                    courseSelect.innerHTML += `<option value="${course.course_name}">${course.course_name}</option>`;
                });
            }
        }
        loadCoursesDropdown(); // เรียกใช้งานทันที
    }

    if (courseForm) {
        if (loggedInUser) {
            const emailInput = document.getElementById('userEmail');
            emailInput.value = loggedInUser.email;
            emailInput.readOnly = true; 
        }

        courseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('userEmail').value;
            const selectedCourse = document.getElementById('courseSelect').value;

            // ... (โค้ดเช็คและสมัครคอร์สแบบเดิมของคุณ) ...
            const { data: enrollCheck, error: enrollError } = await supabaseClient
                .from('enrollments').select('*')
                .eq('email', email).eq('course_name', selectedCourse);

            if (enrollCheck.length > 0) {
                alert('คุณได้สมัครคอร์สนี้ไปแล้วครับ ไม่สามารถสมัครซ้ำได้');
                return;
            }

            const { data, error } = await supabaseClient
                .from('enrollments').insert([{ email: email, course_name: selectedCourse }]);

            if (error) {
                alert('เกิดข้อผิดพลาดในการลงทะเบียนคอร์ส');
            } else {
                alert(`ลงทะเบียนคอร์ส "${selectedCourse}" สำเร็จแล้ว!`);
                courseSelect.value = ''; // รีเซ็ตแค่ dropdown
            }
        });
    }

    // ==========================================
    // 6. จัดการหน้าแอดมิน (admin.html)
    // ==========================================
    // ==========================================
    // จัดการระบบ เพิ่ม/แก้ไข/ลบ คอร์สเรียน (admin.html)
    // ==========================================
    const courseManageForm = document.getElementById('courseManageForm');
    const courseManageTableBody = document.getElementById('courseManageTableBody');
    
    if (courseManageTableBody) {
        // 1. ฟังก์ชันโหลดรายชื่อบทเรียน
        window.loadManageCourses = async function() {
            const { data, error } = await supabaseClient.from('courses').select('*').order('id', { ascending: true });
            courseManageTableBody.innerHTML = '';
            if (data) {
                data.forEach(course => {
                    courseManageTableBody.innerHTML += `
                        <tr>
                            <td>${course.id}</td>
                            <td>${course.course_name}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="editCourse(${course.id}, '${course.course_name}')">แก้ไข</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCourse(${course.id})">ลบ</button>
                            </td>
                        </tr>
                    `;
                });
            }
        };
        loadManageCourses(); // เรียกใช้งานเมื่อเปิดหน้าแอดมิน

        // 2. ฟังก์ชันเมื่อกดปุ่ม "ลบ"
        window.deleteCourse = async function(id) {
            if (confirm('คุณแน่ใจหรือไม่ที่จะลบบทเรียนนี้?')) {
                await supabaseClient.from('courses').delete().eq('id', id);
                alert('ลบข้อมูลเรียบร้อยแล้ว');
                loadManageCourses(); // โหลดตารางใหม่
            }
        };

        // 3. ฟังก์ชันเมื่อกดปุ่ม "แก้ไข"
        window.editCourse = function(id, name) {
            document.getElementById('editCourseId').value = id;
            document.getElementById('inputCourseName').value = name;
            document.getElementById('formTitle').textContent = 'แก้ไขบทเรียน';
            document.getElementById('saveCourseBtn').textContent = 'อัปเดตบทเรียน';
            document.getElementById('saveCourseBtn').classList.replace('btn-success', 'btn-warning');
            document.getElementById('cancelEditBtn').style.display = 'block';
        };

        // 4. ฟังก์ชันเมื่อกดยกเลิกการแก้ไข
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            courseManageForm.reset();
            document.getElementById('editCourseId').value = '';
            document.getElementById('formTitle').textContent = 'เพิ่มบทเรียนใหม่';
            document.getElementById('saveCourseBtn').textContent = 'บันทึกบทเรียน';
            document.getElementById('saveCourseBtn').classList.replace('btn-warning', 'btn-success');
            document.getElementById('cancelEditBtn').style.display = 'none';
        });

        // 5. บันทึก หรือ อัปเดต ข้อมูลเมื่อกด Submit
        courseManageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('editCourseId').value;
            const name = document.getElementById('inputCourseName').value;

            if (id) {
                // ถ้ามี ID คือการแก้ไข (Update)
                await supabaseClient.from('courses').update({ course_name: name }).eq('id', id);
                alert('อัปเดตข้อมูลสำเร็จ!');
            } else {
                // ถ้าไม่มี ID คือการเพิ่มใหม่ (Insert)
                await supabaseClient.from('courses').insert([{ course_name: name }]);
                alert('เพิ่มบทเรียนใหม่สำเร็จ!');
            }
            
            document.getElementById('cancelEditBtn').click(); // เรียกใช้ฟังก์ชันยกเลิกเพื่อล้างฟอร์ม
            loadManageCourses(); // โหลดตารางใหม่
        });
    }

    // ==========================================
    // จัดการระบบตารางสมาชิก (admin.html)
    // ==========================================
    const registeredUsersTableBody = document.getElementById('registeredUsersTableBody');
    const totalUsersCount = document.getElementById('totalUsersCount');
    
    if (registeredUsersTableBody) {
        // ฟังก์ชันโหลดรายชื่อสมาชิกทั้งหมดจากตาราง users
        window.loadRegisteredUsers = async function() {
            try {
                // ดึงข้อมูลจาก Supabase เรียงตาม ID
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                
                registeredUsersTableBody.innerHTML = '';
                
                if (error) throw error;

                if (data && data.length > 0) {
                    // อัปเดตตัวเลขจำนวนสมาชิกรวม
                    if (totalUsersCount) totalUsersCount.textContent = `รวม ${data.length} บัญชี`;

                    // วนลูปสร้างตาราง
                    data.forEach(user => {
                        // เช็คสิทธิ์เพื่อใส่ป้ายสีสวยๆ
                        const roleBadge = user.role === 'admin' 
                            ? '<span class="badge bg-danger">Admin</span>' 
                            : '<span class="badge bg-secondary">User</span>';
                        
                        // เผื่อกรณีที่คุณยังไม่มีคอลัมน์ id ในตาราง users
                        const userId = user.id ? user.id : '-';

                        registeredUsersTableBody.innerHTML += `
                            <tr>
                                <td>${userId}</td>
                                <td>${user.fullname}</td>
                                <td>${user.username}</td>
                                <td>${user.email}</td>
                                <td>${roleBadge}</td>
                            </tr>
                        `;
                    });
                } else {
                    registeredUsersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">ยังไม่มีข้อมูลสมาชิก</td></tr>';
                    if (totalUsersCount) totalUsersCount.textContent = '0 บัญชี';
                }
            } catch (error) {
                console.error('Error fetching users:', error);
                registeredUsersTableBody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            }
        };

        // เรียกใช้งานทันทีเมื่อโหลดหน้าแอดมิน
        loadRegisteredUsers();
    }

    // ป้องกันคนที่ไม่ใช่ Admin เข้าหน้า admin.html
    if (window.location.pathname.includes('admin.html')) {
        if (!loggedInUser || loggedInUser.role !== 'admin') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ครับเฉพาะ Admin เท่านั้น');
            window.location.href = 'index.html';
        }
    }
});
