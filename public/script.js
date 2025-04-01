// Global variables
let currentStatus = 'not_punched';
let breakStatus = 'not_on_break';
let breakInterval;
let breakSeconds = 0;
let punchInTime = null;
let totalBreakTime = 0;

// DOM Elements
const currentTimeElement = document.getElementById('current-time');
const statusTextElement = document.getElementById('status-text');
const hoursWorkedElement = document.getElementById('hours-worked');
const breakTextElement = document.getElementById('break-text');
const breakDurationElement = document.getElementById('break-duration');
const punchInBtn = document.getElementById('punch-in-btn');
const punchOutBtn = document.getElementById('punch-out-btn');
const teaBreakBtn = document.getElementById('tea-break-btn');
const breakStartBtn = document.getElementById('break-start-btn');
const breakEndBtn = document.getElementById('break-end-btn');

// Update clock every second
function updateClock() {
    const now = new Date();
    currentTimeElement.textContent = now.toLocaleTimeString();
}

// Initialize the app
function init() {
    updateClock();
    setInterval(updateClock, 1000);
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token && window.location.pathname.includes('dashboard')) {
        window.location.href = '/public/index.html';
        return;
    }
    
    // Load saved state from localStorage
    loadState();
    
    // Set up event listeners
    if (punchInBtn) punchInBtn.addEventListener('click', handlePunchIn);
    if (punchOutBtn) punchOutBtn.addEventListener('click', handlePunchOut);
    if (teaBreakBtn) teaBreakBtn.addEventListener('click', handleTeaBreak);
    if (breakStartBtn) breakStartBtn.addEventListener('click', handleBreakStart);
    if (breakEndBtn) breakEndBtn.addEventListener('click', handleBreakEnd);
    
    // Check if we're on dashboard page
    if (window.location.pathname.includes('dashboard')) {
        updateUI();
    }
    
    // Add login form handler if on login page
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const employeeId = document.getElementById('employee-id').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ employee_id: employeeId, password })
                });
                
                if (!response.ok) throw new Error('Login failed');
                
                const { token, name } = await response.json();
                localStorage.setItem('token', token);
                window.location.href = '/public/dashboard.html';
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed. Please check your credentials.');
            }
        });
    }
}

// Handle tea break
function handleTeaBreak() {
    if (breakStatus === 'not_on_break') {
        handleBreakStart();
    } else {
        handleBreakEnd();
    }
}

// Handle punch in
async function handlePunchIn() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/punch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Punch failed');
        
        currentStatus = 'punched_in';
        punchInTime = new Date();
        punchInBtn.disabled = true;
        punchOutBtn.disabled = false;
        breakStartBtn.disabled = false;
        saveState();
        updateUI();
    } catch (error) {
        console.error('Punch error:', error);
        alert('Punch in failed');
    }
}

// Handle punch out
async function handlePunchOut() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/punch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Punch failed');
        
        currentStatus = 'punched_out';
        const punchOutTime = new Date();
        const hoursWorked = calculateHoursWorked(punchInTime, punchOutTime);
        punchInBtn.disabled = false;
        punchOutBtn.disabled = true;
        breakStartBtn.disabled = true;
        breakEndBtn.disabled = true;
        saveState();
        updateUI();
    } catch (error) {
        console.error('Punch error:', error);
        alert('Punch out failed');
    }
}

// Handle break start
function handleBreakStart() {
    breakStatus = 'on_break';
    breakStartBtn.disabled = true;
    breakEndBtn.disabled = false;
    breakSeconds = 0;
    breakInterval = setInterval(updateBreakTimer, 1000);
    saveState();
    updateUI();
    // In a real app, you would send this to the server
    console.log('Break started at:', new Date());
}

// Handle break end
function handleBreakEnd() {
    breakStatus = 'not_on_break';
    clearInterval(breakInterval);
    totalBreakTime += breakSeconds;
    breakStartBtn.disabled = false;
    breakEndBtn.disabled = true;
    saveState();
    updateUI();
    // In a real app, you would send this to the server
    console.log('Break ended at:', new Date());
    console.log('Break duration:', formatTime(breakSeconds));
}

// Update break timer
function updateBreakTimer() {
    breakSeconds++;
    breakDurationElement.textContent = formatTime(breakSeconds);
}

// Calculate hours worked
function calculateHoursWorked(start, end) {
    const diffMs = end - start;
    const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
}

// Format time (seconds to MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

// Update UI based on current state
function updateUI() {
    if (teaBreakBtn) {
        teaBreakBtn.disabled = currentStatus !== 'punched_in';
        teaBreakBtn.textContent = breakStatus === 'on_break' ? 
            'End Tea Break' : 'Start Tea Break';
        teaBreakBtn.className = breakStatus === 'on_break' ?
            'bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all col-span-2 text-sm' :
            'bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all col-span-2 text-sm';
    }
    if (statusTextElement) {
        statusTextElement.textContent = 
            currentStatus === 'punched_in' ? 'Punched In' : 'Not Punched In';
    }
    
    if (breakTextElement) {
        breakTextElement.textContent = 
            breakStatus === 'on_break' ? 'On Break' : 'Not on Break';
    }
    
    if (hoursWorkedElement && punchInTime) {
        const now = new Date();
        hoursWorkedElement.textContent = calculateHoursWorked(punchInTime, now);
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('attendanceState', JSON.stringify({
        currentStatus,
        breakStatus,
        punchInTime: punchInTime ? punchInTime.getTime() : null,
        breakSeconds,
        totalBreakTime
    }));
}

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('attendanceState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentStatus = state.currentStatus || 'not_punched';
        breakStatus = state.breakStatus || 'not_on_break';
        punchInTime = state.punchInTime ? new Date(state.punchInTime) : null;
        breakSeconds = state.breakSeconds || 0;
        totalBreakTime = state.totalBreakTime || 0;
        
        if (breakStatus === 'on_break') {
            breakInterval = setInterval(updateBreakTimer, 1000);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);