// ประกาศตัวแปร Global ไว้ด้านบนสุด
let selectedCourseName = "";
let selectedCoursePrice = 0; 

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('coursesGrid');
    if (grid) loadCourses();

    const search = document.getElementById('searchInput');
    if (search) search.addEventListener('input', (e) => loadCourses(e.target.value.toLowerCase()));
});

async function loadCourses(term = "") {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    // 1. ดึงข้อมูลคอร์สทั้งหมด
    const { data: courses, error: courseError } = await supabaseClient.from('courses').select('*');
    
    // 2. ดึงข้อมูลการสมัครของ User คนนี้ (ถ้า Login อยู่)
    const user = getLoggedInUser();
    let myEnrollments = [];
    if (user) {
        const { data: enrolls } = await supabaseClient
            .from('enrollments')
            .select('course_name')
            .eq('email', user.email);
        myEnrollments = enrolls ? enrolls.map(e => e.course_name) : [];
    }

    if (courseError) {
        console.error("Error loading courses:", courseError);
        return;
    }

    if (courses) {
        const filtered = courses.filter(c => c.course_name.toLowerCase().includes(term));
        
        grid.innerHTML = filtered.map(c => {
            const courseImage = c.image_url || 'https://via.placeholder.com/400x225?text=No+Image';
            const rawPrice = c.price || 0;
            const coursePriceDisplay = rawPrice.toLocaleString();
            
            // --- เช็กสถานะการลงทะเบียน ---
            const isEnrolled = myEnrollments.includes(c.course_name);
            
            let actionButton = "";
            if (isEnrolled) {
                // ถ้าสมัครแล้ว -> ปุ่มแดง
                actionButton = `<button class="btn btn-danger w-100 rounded-pill fw-bold" disabled>
                                    <i class="bi bi-check-circle-fill me-1"></i> คุณได้ลงทะเบียนไว้แล้ว
                                </button>`;
            } else {
                // ถ้ายังไม่สมัคร -> ปุ่มน้ำเงิน (ส่งราคาแบบตัวเลขเข้าไปใน function)
                actionButton = `<button class="btn btn-primary w-100 rounded-pill fw-bold" 
                                    onclick="openEnrollModal('${c.course_name}', ${rawPrice})">
                                    สมัครเรียนเลย
                                </button>`;
            }

            return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden">
                    <img src="${courseImage}" class="card-img-top" style="height: 200px; object-fit: cover;">
                    <div class="card-body p-4">
                        <h5 class="card-title fw-bold mb-3">${c.course_name}</h5>
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <span class="text-primary fw-bold fs-4">฿${coursePriceDisplay}</span>
                            <span class="badge bg-light text-dark border">Online</span>
                        </div>
                        ${actionButton}
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}

// ฟังก์ชันเปิด Modal พร้อมใส่ข้อมูล User อัตโนมัติ
window.openEnrollModal = (courseName, price) => {
    const user = getLoggedInUser();
    if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนสมัครเรียน");
        window.location.href = 'login.html';
        return;
    }

    selectedCourseName = courseName;
    selectedCoursePrice = price;

    // ใส่ค่าลงใน Modal
    document.getElementById('modalCourseName').value = courseName;
    document.getElementById('modalUserFullname').value = user.fullname || user.username;
    
    // ตรวจสอบว่าใน user object มี email ไหม ถ้าไม่มีให้ใส่ "-" หรือ "ไม่ได้ระบุ"
    document.getElementById('modalUserEmail').value = user.email || "ไม่พบข้อมูลอีเมล";

    const enrollModal = new bootstrap.Modal(document.getElementById('enrollModal'));
    enrollModal.show();
};

// ฟังก์ชันยืนยันการสมัคร
window.confirmEnroll = async () => {
    const phoneInput = document.getElementById('modalUserPhone');
    const phone = phoneInput.value.trim();

    // 1. ตรวจสอบการกรอกเบอร์โทรศัพท์
    if (!phone || phone.length < 9) {
        alert("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
        phoneInput.focus();
        return;
    }

    const user = getLoggedInUser();
    const enrollData = {
        course_name: selectedCourseName,
        price: selectedCoursePrice,
        fullname: user.fullname,
        email: user.email,
        phone: phone,
        status: 'pending_check' // สถานะเริ่มต้น
    };

    // 2. ตรวจสอบราคา (Logic แยกเส้นทาง)
    if (selectedCoursePrice > 0) {
        // --- กรณีมีราคา: ไปหน้าชำระเงิน ---
        sessionStorage.setItem('pendingEnroll', JSON.stringify(enrollData));
        window.location.href = 'payment.html';
    } else {
        // --- กรณีคอร์สฟรี (ราคา 0): บันทึกลงฐานข้อมูลทันที ---
        try {
            const { error } = await supabaseClient
                .from('enrollments')
                .insert([{
                    course_name: enrollData.course_name,
                    fullname: enrollData.fullname,
                    email: enrollData.email,
                    phone: enrollData.phone,
                    status: 'success' // คอร์สฟรีปรับเป็น success ได้เลย หรือจะเป็น pending_check ก็ได้
                }]);

            if (error) throw error;

            alert("ลงทะเบียนคอร์สเรียนฟรีสำเร็จแล้ว!");
            location.reload(); // รีโหลดหน้าเพื่ออัปเดตสถานะปุ่มเป็น "ลงทะเบียนแล้ว"
        } catch (error) {
            console.error("Error enrolling free course:", error);
            alert("เกิดข้อผิดพลาดในการสมัคร: " + error.message);
        }
    }
};

// --- ฟังก์ชันอื่นๆ (ตารางเรียน / เข้าเรียน) คงเดิมตามที่คุณส่งมา ---
window.loadMyCourses = loadMyCourses; // ผูกฟังก์ชันเข้ากับ window เพื่อให้ HTML เรียกใช้ได้

async function loadMyCourses() {
    const user = getLoggedInUser();
    const listElement = document.getElementById('myCoursesList');
    if (!user || !listElement) return;

    listElement.innerHTML = '<li class="list-group-item text-center">กำลังโหลด...</li>';

    const { data, error } = await supabaseClient
        .from('enrollments')
        .select('*')
        .eq('email', user.email);

    if (data && data.length > 0) {
        listElement.innerHTML = data.map(item => {
            const isApproved = item.status === 'success';
            return `
                <li class="list-group-item p-3">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h6 class="mb-0 fw-bold">${item.course_name}</h6>
                            <small>สถานะ: ${isApproved ? '<span class="text-success fw-bold">อนุมัติแล้ว</span>' : '<span class="text-warning">รอตรวจสอบ</span>'}</small>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill" onclick="showSchedule('${item.course_name}')">
                            <i class="bi bi-calendar3"></i> ตารางเรียน
                        </button>
                        <button class="btn btn-sm ${isApproved ? 'btn-success' : 'btn-secondary'} flex-fill" 
                                ${isApproved ? '' : 'disabled'} 
                                onclick="joinCourse('${item.course_name}')">
                            <i class="bi bi-play-circle"></i> เข้าเรียน
                        </button>
                    </div>
                </li>`;
        }).join('');
    } else {
        listElement.innerHTML = '<li class="list-group-item text-center py-4 text-muted">ไม่พบข้อมูลการสมัคร</li>';
    }
}

window.showSchedule = async (courseName) => {
    const { data } = await supabaseClient.from('schedules').select('*').eq('course_name', courseName);
    if (data && data.length > 0) {
        let info = data.map(s => `📅 ${s.day_of_week}: ${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)} น.\n📍 สถานที่: ${s.room}`).join('\n\n');
        alert(`ตารางเรียนวิชา: ${courseName}\n\n${info}`);
    } else {
        alert("ยังไม่มีกำหนดการเรียนสำหรับวิชานี้");
    }
};

window.joinCourse = async (courseName) => {
    const { data } = await supabaseClient.from('schedules').select('join_link').eq('course_name', courseName).single();
    if (data && data.join_link) {
        window.open(data.join_link, '_blank');
    } else {
        alert("ยังไม่มีลิงก์เข้าเรียนในขณะนี้");
    }
};