document.addEventListener('DOMContentLoaded', () => {
    const user = getLoggedInUser();
    if (window.location.pathname.includes('admin.html')) {
        if (!user || user.role !== 'admin') { 
            window.location.href = 'index.html'; 
        } else {
            loadAdminCourses();
            loadAdminUsers();
            loadAdminEnrollments();
            updateDashboardStats(); // <--- เพิ่มการเรียกฟังก์ชันนี้
            loadAdminSchedules();
        }
    }
});

async function loadAdminSchedules() {
    const body = document.getElementById('scheduleTableBody');
    if (!body) return;

    const { data, error } = await supabaseClient
        .from('schedules')
        .select('*')
        .order('course_name', { ascending: true });

    if (error) {
        console.error("Error loading schedules:", error);
        return;
    }

    if (data && data.length > 0) {
        body.innerHTML = data.map(s => `
            <tr>
                <td class="fw-bold">${s.course_name}</td>
                <td>${s.day_of_week}</td>
                <td>${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}</td>
                <td><small>${s.room || '-'}</small></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSchedule(${s.id})">
                        <i class="bi bi-trash"></i> ลบ
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        body.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">ยังไม่มีข้อมูลตารางเรียน</td></tr>';
    }
}

// ฟังก์ชันลบตารางเรียน
window.deleteSchedule = async (id) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตารางเรียนนี้?")) {
        const { error } = await supabaseClient
            .from('schedules')
            .delete()
            .eq('id', id);

        if (!error) {
            alert("ลบข้อมูลเรียบร้อย");
            loadAdminSchedules(); // โหลดข้อมูลใหม่
        } else {
            alert("ไม่สามารถลบได้: " + error.message);
        }
    }
};

async function updateDashboardStats() {
    try {
        // 1. นับจำนวนสมาชิกทั้งหมด
        const { count: uCount, error: uError } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });

        // 2. นับจำนวนคอร์สทั้งหมด
        const { count: cCount, error: cError } = await supabaseClient
            .from('courses')
            .select('*', { count: 'exact', head: true });

        // 3. นับรายการที่ "รอตรวจสอบ" (pending_check)
        const { count: pCount, error: pError } = await supabaseClient
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_check');

        // 4. คำนวณรายได้รวม (เฉพาะรายการที่สถานะเป็น 'success')
        // เราต้องดึงข้อมูล enrollments มาเช็คคู่กับราคาในตาราง courses
        const { data: salesData, error: sError } = await supabaseClient
            .from('enrollments')
            .select('course_name')
            .eq('status', 'success');

        const { data: coursesPrice } = await supabaseClient
            .from('courses')
            .select('course_name, price');

        let totalRevenue = 0;
        if (salesData && coursesPrice) {
            salesData.forEach(sale => {
                const course = coursesPrice.find(c => c.course_name === sale.course_name);
                if (course) totalRevenue += (course.price || 0);
            });
        }

        // แสดงผลลงใน HTML
        if (document.getElementById('userCount')) 
            document.getElementById('userCount').innerText = uCount || 0;
        
        if (document.getElementById('courseCount')) 
            document.getElementById('courseCount').innerText = cCount || 0;
        
        if (document.getElementById('pendingCount')) 
            document.getElementById('pendingCount').innerText = pCount || 0;
        
        if (document.getElementById('totalRevenue')) 
            document.getElementById('totalRevenue').innerText = `฿${totalRevenue.toLocaleString()}`;

    } catch (err) {
        console.error("Dashboard Stats Error:", err);
    }
}

// แก้ไขฟังก์ชันอนุมัติให้สั่งอัปเดตตัวเลข Dashboard ด้วย
window.approveEnrollment = async (id) => {
    if (confirm("ยืนยันการตรวจสอบการชำระเงิน?")) {
        const { error } = await supabaseClient
            .from('enrollments')
            .update({ status: 'success' })
            .eq('id', id);

        if (!error) {
            alert("อนุมัติเรียบร้อย");
            loadAdminEnrollments(); // โหลดตารางใหม่
            updateDashboardStats(); // <--- อัปเดตตัวเลขสรุปใหม่ทันที
        }
    }
};

// --- 1. จัดการคอร์สเรียน ---
async function loadAdminCourses() {
    const tableBody = document.getElementById('courseManageTableBody');
    if (!tableBody) return;
    const { data } = await supabaseClient.from('courses').select('*').order('id', {ascending: false});
    if (data) {
        tableBody.innerHTML = data.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.course_name}</td>
                <td><strong class="text-success">${c.price ? c.price.toLocaleString() : 0} บ.</strong></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger" onclick="deleteCourse(${c.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    }
}

window.deleteCourse = async (id) => {
    if (confirm("ยืนยันการลบพื้นฐานคอร์สนี้?")) {
        const { error } = await supabaseClient.from('courses').delete().eq('id', id);
        if (!error) location.reload();
    }
};

// --- 2. จัดการสมาชิก (Users) ---
async function loadAdminUsers() {
    const body = document.getElementById('userTableBody');
    const userCount = document.getElementById('userCount');
    if (!body) return;
    
    const { data } = await supabaseClient.from('users').select('*').order('fullname', { ascending: true });
    if (data) {
        if (userCount) userCount.innerText = data.length;
        body.innerHTML = data.map(u => `
            <tr>
                <td class="ps-3 fw-bold">${u.fullname}</td>
                <td><small class="text-muted">${u.username}</small></td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-info'}">${u.role}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning" onclick="openEditUserModal('${u.email}', '${u.fullname}')">แก้ไข</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.email}')">ลบ</button>
                </td>
            </tr>`).join('');
    }
}

// --- 3. ประวัติการสมัครเรียน พร้อมระบบค้นหา ---
async function loadAdminEnrollments() {
    const body = document.getElementById('enrollmentTableBody');
    if (!body) return;

    const { data, error } = await supabaseClient
        .from('enrollments')
        .select('*')
        .order('enroll_date', { ascending: false });

    if (data) {
        body.innerHTML = data.map(e => {
            // สร้าง Badge แสดงสถานะ
            const statusBadge = e.status === 'success' 
                ? '<span class="badge bg-success">ชำระเงินแล้ว</span>' 
                : '<span class="badge bg-warning text-dark">รอตรวจสอบ</span>';

            // ปุ่มอนุมัติ (จะแสดงเฉพาะรายการที่ยังไม่ได้อนุมัติ)
            const actionButton = e.status === 'pending_check' 
                ? `<button class="btn btn-sm btn-outline-primary" onclick="approveEnrollment(${e.id})">อนุมัติ</button>` 
                : `<i class="bi bi-check-circle-fill text-success"></i>`;

            return `
            <tr>
                <td class="ps-3">${e.fullname}</td>
                <td>${e.email}</td>
                <td>${e.course_name}</td>
                <td>${new Date(e.enroll_date).toLocaleDateString('th-TH')}</td>
                <td>${statusBadge}</td>
                <td>${actionButton}</td>
            </tr>`;
        }).join('');
    }
}

// ฟังก์ชันสำหรับแอดมินกดอนุมัติ
window.approveEnrollment = async (id) => {
    if (confirm("ยืนยันการตรวจสอบการชำระเงิน?")) {
        const { error } = await supabaseClient
            .from('enrollments')
            .update({ status: 'success' })
            .eq('id', id);

        if (!error) {
            alert("อนุมัติการสมัครเรียนเรียบร้อยแล้ว");
            loadAdminEnrollments(); // โหลดตารางใหม่
        } else {
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    }
};

// --- 4. ฟังก์ชันเสริมอื่นๆ ---
window.openEditUserModal = (email, fullname) => {
    document.getElementById('editUserId').value = email;
    document.getElementById('editFullname').value = fullname;
    document.getElementById('editPassword').value = '';
    new bootstrap.Modal(document.getElementById('editUserModal')).show();
};

const editUserForm = document.getElementById('editUserForm');
if (editUserForm) {
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('editUserId').value;
        const fullname = document.getElementById('editFullname').value;
        const password = document.getElementById('editPassword').value;
        
        let updateData = { fullname };
        if (password) updateData.password = password;

        const { error } = await supabaseClient.from('users').update(updateData).eq('email', email);
        if (!error) { alert("แก้ไขเรียบร้อย"); location.reload(); }
    });
}

const courseForm = document.getElementById('courseManageForm');
if (courseForm) {
    courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('inputCourseName').value;
        const price = document.getElementById('inputCoursePrice').value;
        const imageUrl = document.getElementById('inputCourseImage').value; // ดึงค่า URL รูป
        
        const { error } = await supabaseClient
            .from('courses')
            .insert([{ 
                course_name: name, 
                price: parseInt(price),
                image_url: imageUrl // บันทึกรูปภาพ
            }]);
            
        if (!error) {
            alert("เพิ่มคอร์สสำเร็จ");
            location.reload();
        } else {
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    });
}

const scheduleForm = document.getElementById('scheduleManageForm');
if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const schedData = {
            course_name: document.getElementById('schedCourseName').value,
            day_of_week: document.getElementById('schedDay').value,
            start_time: document.getElementById('schedStart').value,
            end_time: document.getElementById('schedEnd').value,
            join_link: document.getElementById('schedLink').value,
            room: document.getElementById('schedRoom').value
        };

        const { error } = await supabaseClient.from('schedules').insert([schedData]);

        if (!error) {
            alert("บันทึกตารางเรียนเรียบร้อย!");
            scheduleForm.reset();
        } else {
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    });
}