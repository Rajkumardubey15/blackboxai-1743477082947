const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const Employee = sequelize.define('Employee', {
  employee_id: DataTypes.STRING,
  name: DataTypes.STRING
});

const Attendance = sequelize.define('Attendance', {
  employee_id: DataTypes.STRING,
  punch_in: DataTypes.DATE,
  punch_out: DataTypes.DATE,
  break_start: DataTypes.DATE,
  break_end: DataTypes.DATE
});

async function getAttendance(employeeId, date) {
  let where = {};
  if (employeeId) where.employee_id = employeeId;
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

  console.table(records.map(r => ({
    Name: r.Employee.name,
    ID: r.employee_id,
    'Punch In': r.punch_in,
    'Punch Out': r.punch_out,
    'Break Start': r.break_start,
    'Break End': r.break_end
  })));
}

// Usage: node query_attendance.js [employee_id] [date]
getAttendance(process.argv[2], process.argv[3]);