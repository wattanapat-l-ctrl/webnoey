const supabaseUrl = 'https://uynzvfiijhuytgjoaaoi.supabase.co'; 
const supabaseKey = 'sb_publishable_SCzdlhWZGxDYtFL8GTc8MA_H6iSup8-'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ฟังก์ชันช่วยดึงข้อมูล User จาก LocalStorage
function getLoggedInUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}