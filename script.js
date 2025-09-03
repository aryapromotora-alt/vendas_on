import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAU0mGexI8c7UIdjlCScimOhxjkCW13qaI",
  authDomain: "vendas-on-f3ae1.firebaseapp.com",
  projectId: "vendas-on-f3ae1",
  storageBucket: "vendas-on-f3ae1.appspot.com",
  messagingSenderId: "645658657777",
  appId: "1:645658657777:web:7cad80b0a4cb452873ba50",
  measurementId: "G-QN7HK21M2H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = null;
let isAdmin = false;
let employees = [];
let spreadsheetData = {};

const defaultEmployees = [
  { name: 'Anderson', password: '123' },
  { name: 'Vitoria', password: '123' },
  { name: 'Jemima', password: '123' },
  { name: 'Maiany', password: '123' },
  { name: 'Fernanda', password: '123' },
  { name: 'Nadia', password: '123' },
  { name: 'Giovana', password: '123' }
];

const adminCredentials = { username: 'admin', password: 'admin123' };

document.addEventListener('DOMContentLoaded', async function () {
  await initializeAppData();
  setupEventListeners();
});

async function initializeAppData() {
  await loadEmployees();
  await loadSpreadsheetData();
}

async function loadEmployees() {
  const snapshot = await getDocs(collection(db, "usuarios"));
  employees = [];
  if (snapshot.empty) {
    for (const emp of defaultEmployees) {
      await setDoc(doc(db, "usuarios", emp.name), { password: emp.password });
      employees.push(emp);
    }
  } else {
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      employees.push({ name: docSnap.id, password: data.password });
    });
  }
}

async function loadSpreadsheetData() {
  const snapshot = await getDocs(collection(db, "vendas"));
  spreadsheetData = {};
  snapshot.forEach(docSnap => {
    spreadsheetData[docSnap.id] = docSnap.data();
  });
}

function setupEventListeners() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('admin-panel-btn').addEventListener('click', showAdminPanel);
  document.getElementById('back-to-main').addEventListener('click', hideAdminPanel);
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', switchTab);
  });
  document.getElementById('add-employee-form').addEventListener('submit', handleAddEmployee);
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (username === adminCredentials.username && password === adminCredentials.password) {
    currentUser = 'Administrador';
    isAdmin = true;
    showMainSection();
    return;
  }

  const employee = employees.find(emp =>
    emp.name.toLowerCase() === username.toLowerCase() && emp.password === password
  );

  if (employee) {
    currentUser = employee.name;
    isAdmin = false;
    showMainSection();
  } else {
    showMessage('Usuário ou senha incorretos!', 'error');
  }
}

function handleLogout() {
  currentUser = null;
  isAdmin = false;
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('main-section').style.display = 'none';
  document.getElementById('admin-section').style.display = 'none';
  document.getElementById('login-form').reset();
}

function showMainSection() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('main-section').style.display = 'block';
  document.getElementById('admin-section').style.display = 'none';
  document.getElementById('logged-user').textContent = `Logado como: ${currentUser}`;
  document.getElementById('admin-panel-btn').style.display = isAdmin ? 'inline-block' : 'none';
  renderSpreadsheet();
}

function renderSpreadsheet() {
  const tbody = document.getElementById('employee-rows');
  tbody.innerHTML = '';
  employees.forEach(employee => {
    const row = createEmployeeRow(employee.name);
    tbody.appendChild(row);
  });
  updateTotals();
}

function createEmployeeRow(employeeName) {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  nameCell.textContent = employeeName;
  nameCell.className = 'employee-name';
  row.appendChild(nameCell);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  days.forEach(day => {
    const cell = document.createElement('td');
    const value = spreadsheetData[employeeName]?.[day] || 0;
    cell.textContent = formatCurrency(value);
    cell.className = 'editable-cell';
    cell.dataset.employee = employeeName;
    cell.dataset.day = day;
    if (isAdmin || currentUser === employeeName) {
      cell.addEventListener('click', handleCellClick);
    }
    row.appendChild(cell);
  });

  const totalCell = document.createElement('td');
  const weeklyTotal = calculateWeeklyTotal(employeeName);
  totalCell.textContent = formatCurrency(weeklyTotal);
  totalCell.className = 'total-cell';
  row.appendChild(totalCell);

  return row;
}

function handleCellClick(e) {
  const cell = e.target;
  const currentValue = spreadsheetData[cell.dataset.employee][cell.dataset.day];
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.01';
  input.value = currentValue;
  input.style.width = '100%';
  input.style.textAlign = 'center';
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  input.addEventListener('blur', () => finishEditing(cell, input));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') finishEditing(cell, input);
  });
}

async function finishEditing(cell, input) {
  const newValue = parseFloat(input.value) || 0;
  const employee = cell.dataset.employee;
  const day = cell.dataset.day;

  if (!spreadsheetData[employee]) {
    spreadsheetData[employee] = {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0
    };
  }

  spreadsheetData[employee][day] = newValue;
  cell.textContent = formatCurrency(newValue);
  await setDoc(doc(db, "vendas", employee), spreadsheetData[employee]);
  updateTotals();
}

function calculateWeeklyTotal(employeeName) {
  const data = spreadsheetData[employeeName];
  return data ? data.monday + data.tuesday + data.wednesday + data.thursday + data.friday : 0;
}

function updateTotals() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  let weekTotal = 0;

  days.forEach(day => {
    let dayTotal = 0;
    employees.forEach(employee => {
      dayTotal += spreadsheetData[employee.name]?.[day] || 0;
    });
    const dayTotalElement = document.getElementById(`${day}-total`);
    if (dayTotalElement) dayTotalElement.textContent = formatCurrency(dayTotal);
    weekTotal += dayTotal;
  });

  employees.forEach(employee => {
    const weeklyTotal = calculateWeeklyTotal(employee.name);
    const row = document.querySelector(`[data-employee="${employee.name}"]`)?.parentElement;
    if (row) {
      const totalCell = row.querySelector('.total-cell');
      if (totalCell) totalCell.textContent = formatCurrency(weeklyTotal);
    }
  });

  const weekTotalElement = document.getElementById('week-total');
  if (weekTotalElement) weekTotalElement.textContent = formatCurrency(weekTotal);
}

function formatCurrency(value) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function showAdminPanel() {
  document.getElementById('admin-section').style.display = 'block';
  renderEmployeeManagement();
}

function