# Employee Attendance System Installation

## Download Options

1. **Download Package**:
   [employee-attendance-system.zip](https://example.com/employee-attendance-system.zip)  
   *(Note: Replace with your actual hosting URL)*

2. **Git Clone** (for developers):
   ```bash
   git clone https://github.com/your-repo/employee-attendance-system.git
   ```

## PC Installation Guide

### Windows Installation
1. Download the zip file
2. Right-click → "Extract All"
3. Open Command Prompt in the extracted folder
4. Run:
   ```bash
   npm install
   node server.js
   ```

### Mac/Linux Installation
1. Download the zip file
2. Unzip: `unzip employee-attendance-system.zip`
3. In terminal:
   ```bash
   cd employee-attendance-system
   npm install
   ./start.sh
   ```

## First Run
1. Access: http://localhost:8000/public/index.html
2. Login with:
   - ID: EMP001
   - Password: password123

## Troubleshooting
- **Port in use**: Change port in `server.js`
- **Installation issues**: Run `npm clean-install`