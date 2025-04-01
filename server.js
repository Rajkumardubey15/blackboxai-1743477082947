require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Similar routes for break handling would be added here

// Initialize database and start server
async function initialize() {
  try {
    await sequelize.sync();
    console.log('Database connected');

    // Create test employee if none exists
    const testEmployee = await Employee.findOne();
    if (!testEmployee) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await Employee.create({
        employee_id: 'EMP001',
        password_hash: hashedPassword,
        name: 'Test Employee'
      });
      console.log('Test employee created (EMP001/password123)');
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