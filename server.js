require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// Database setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

// Models
const Employee = sequelize.define('Employee', {
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const Attendance = sequelize.define('Attendance', {
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  punch_in: {
    type: DataTypes.DATE
  },
  punch_out: {
    type: DataTypes.DATE
  },
  break_start: {
    type: DataTypes.DATE
  },
  break_end: {
    type: DataTypes.DATE
  }
});

// Relationships
Employee.hasMany(Attendance, { foreignKey: 'employee_id' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id' });

// Routes
app.post('/api/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;
    const employee = await Employee.findOne({ where: { employee_id } });
    
    if (!employee) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: employee.id, employee_id: employee.employee_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, name: employee.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/punch', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await Employee.findOne({ where: { employee_id: decoded.employee_id } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      where: {
        employee_id: employee.employee_id,
        punch_in: { [Sequelize.Op.gte]: today }
      }
    });

    if (!attendance) {
      // First punch of the day
      attendance = await Attendance.create({
        employee_id: employee.employee_id,
        punch_in: new Date()
      });
      return res.json({ message: 'Punched in successfully' });
    }

    if (!attendance.punch_out) {
      // Punching out
      attendance.punch_out = new Date();
      await attendance.save();
      return res.json({ message: 'Punched out successfully' });
    }

    res.status(400).json({ error: 'Already punched out for today' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { employee_id, password, name } = req.body;
    
    if (!employee_id || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await Employee.findOne({ where: { employee_id } });
    if (existing) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await Employee.create({
      employee_id,
      password_hash: hashedPassword,
      name
    });

    const token = jwt.sign(
      { id: employee.id, employee_id: employee.employee_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      employee_id: employee.employee_id,
      name: employee.name,
      token: token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance data
app.get('/api/attendance', async (req, res) => {
  try {
    const { employee_id, date } = req.query;
    let where = {};
    
    if (employee_id) where.employee_id = employee_id;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23,59,59,999);
      where.punch_in = { [Sequelize.Op.between]: [dayStart, dayEnd] };
    }

    const records = await Attendance.findAll({
      where,
      order: [['punch_in', 'DESC']],
      include: [{
        model: Employee,
        attributes: ['name']
      }]
    });

    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Password reset endpoints
app.post('/api/password/reset-request', async (req, res) => {
    try {
        const { employee_id } = req.body;
        const employee = await Employee.findOne({ where: { employee_id } });
        
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // In production, send email with reset token
        const resetToken = jwt.sign(
            { id: employee.id, employee_id: employee.employee_id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ 
            message: 'If this was a real system, we would send a reset link to your email',
            token: resetToken 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/password/reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const employee = await Employee.findOne({ 
            where: { employee_id: decoded.employee_id } 
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await employee.update({ password_hash: hashedPassword });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});

// Mobile download and PWA endpoints
app.get('/download', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'downloads', 'employee-app.apk');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            error: 'Mobile application not available',
            solution: 'Please contact IT support or try again later',
            status: 'not_found'
        });
    }

    // Set proper headers for APK download
    res.set({
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="employee-portal.apk"',
        'Content-Length': fs.statSync(filePath).size,
        'Cache-Control': 'no-cache'
    });

    // Stream the file with error handling
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
        console.error('Download error:', err);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Download failed',
                details: err.message,
                status: 'download_error'
            });
        }
    });
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(`${__dirname}/public/manifest.json`);
});

// Initialize database and start server
async function initialize() {
    try {
        await sequelize.sync({ force: true });
        console.log('Database connected');

        // Create test employees
        const employees = [
        {
          employee_id: 'EMP001',
          password: 'admin@123',
          name: 'Admin User'
        },
        {
          employee_id: 'EMP002',
          password: 'manager@123',
          name: 'Department Manager'
        },
        {
          employee_id: 'EMP003',
          password: 'staff@123',
          name: 'Regular Staff'
        },
        {
          employee_id: 'EMP004',
          password: 'intern@123',
          name: 'Intern'
        }
      ];

      for (const emp of employees) {
        const hashedPassword = await bcrypt.hash(emp.password, 10);
        await Employee.create({
          employee_id: emp.employee_id,
          password_hash: hashedPassword,
          name: emp.name
        });
        console.log(`Employee created (${emp.employee_id}/${emp.password})`);
      }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

initialize();