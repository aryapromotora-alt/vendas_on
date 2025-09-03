import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot
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

// 🔐 Login
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (username === "admin" && password === "admin123") {
    currentUser = "Administrador";
    isAdmin = true;
    showMainSection();
    return;
  }

  const ref = doc(db, "usuarios", username);
  const snapshot = await getDoc(ref);

  if (snapshot.exists() && snapshot.data().password === password) {
    currentUser = username;
    isAdmin = false;
    showMainSection();
  } else {
    showMessage("Usuário ou senha incorretos!", "error");
  }
});

// 🔄 Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  location.reload();
});

// 🔄 Painel Admin
document.getElementById("admin-panel-btn").addEventListener("click", () => {
  document.getElementById("main-section").style.display = "none";
  document.getElementById("admin-section").style.display = "block";
});

document.getElementById("back-to-main").addEventListener("click", () => {
  document.getElementById("admin-section").style.display = "none";
  document.getElementById("main-section").style.display = "block";
});

// 🧩 Adicionar vendedor
document.getElementById("add-employee-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("new-employee-name").value.trim().toLowerCase();
  const password = document.getElementById("new-employee-password").value;

  if (!name || !password) {
    showMessage("Preencha todos os campos!", "error");
    return;
  }

  const ref = doc(db, "usuarios", name);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    showMessage("Funcionário já existe!", "error");
    return;
  }

  await setDoc(ref, { password });
  await setDoc(doc(db, "vendas", name), {
    segunda: 0,
    terca: 0,
    quarta: 0,
    quinta: 0,
    sexta: 0
  });

  document.getElementById("add-employee-form").reset();
  showMessage("Funcionário adicionado com sucesso!", "success");
  renderEmployeeManagement();
});

// 📊 Atualizar planilha em tempo real
onSnapshot(collection(db, "vendas"), (snapshot) => {
  const tbody = document.getElementById("employee-rows");
  tbody.innerHTML = "";

  let totalSeg = 0, totalTer = 0, totalQua = 0, totalQui = 0, totalSex = 0, totalGeral = 0;

  snapshot.forEach((doc) => {
    const nome = doc.id;
    const dados = doc.data();

    const seg = dados.segunda || 0;
    const ter = dados.terca || 0;
    const qua = dados.quarta || 0;
    const qui = dados.quinta || 0;
    const sex = dados.sexta || 0;
    const total = seg + ter + qua + qui + sex;

    totalSeg += seg;
    totalTer += ter;
    totalQua += qua;
    totalQui += qui;
    totalSex += sex;
    totalGeral += total;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${nome}</td>
      <td class="editable-cell" data-employee="${nome}" data-day="segunda">${formatCurrency(seg)}</td>
      <td class="editable-cell" data-employee="${nome}" data-day="terca">${formatCurrency(ter)}</td>
      <td class="editable-cell" data-employee="${nome}" data-day="quarta">${formatCurrency(qua)}</td>
      <td class="editable-cell" data-employee="${nome}" data-day="quinta">${formatCurrency(qui)}</td>
      <td class="editable-cell" data-employee="${nome}" data-day="sexta">${formatCurrency(sex)}</td>
      <td class="total-cell">${formatCurrency(total)}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("monday-total").textContent = formatCurrency(totalSeg);
  document.getElementById("tuesday-total").textContent = formatCurrency(totalTer);
  document.getElementById("wednesday-total").textContent = formatCurrency(totalQua);
  document.getElementById("thursday-total").textContent = formatCurrency(totalQui);
  document.getElementById("friday-total").textContent = formatCurrency(totalSex);
  document.getElementById("week-total").textContent = formatCurrency(totalGeral);

  enableCellEditing();
});

// ✏️ Edição de células
function enableCellEditing() {
  document.querySelectorAll(".editable-cell").forEach(cell => {
    const employee = cell.dataset.employee;
    if (isAdmin || currentUser === employee) {
      cell.addEventListener("click", () => {
        const day = cell.dataset.day;
        const currentValue = parseFloat(cell.textContent.replace("R$", "").replace(",", ".")) || 0;

        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.value = currentValue;
        input.style.width = "100%";
        input.style.textAlign = "center";

        cell.innerHTML = "";
        cell.appendChild(input);
        input.focus();

        input.addEventListener("blur", () => finishEditing(cell, input));
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") finishEditing(cell, input);
        });
      });
    }
  });
}

async function finishEditing(cell, input) {
  const newValue = parseFloat(input.value) || 0;
  const employee = cell.dataset.employee;
  const day = cell.dataset.day;

  const ref = doc(db, "vendas", employee);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    const dados = snapshot.data();
    dados[day] = newValue;
    await setDoc(ref, dados);
  }

  cell.textContent = formatCurrency(newValue);
}

// 🧠 Painel de gerenciamento
function renderEmployeeManagement() {
  const list = document.getElementById("employee-management-list");
  list.innerHTML = "";

  getDocs(collection(db, "usuarios")).then(snapshot => {
    snapshot.forEach(doc => {
      const name = doc.id;
      if (name !== "admin") {
        const li = document.createElement("li");
        const info = document.createElement("span");
        info.className = "employee-info";
        info.textContent = name;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remover";
        removeBtn.className = "remove-btn";
        removeBtn.addEventListener("click", () => removeEmployee(name));

        li.appendChild(info);
        li.appendChild(removeBtn);
        list.appendChild(li);
      }
    });
  });
}

async function removeEmployee(name) {
  if (confirm(`Tem certeza que deseja remover ${name}?`)) {
    await setDoc(doc(db, "usuarios", name), {});
    await setDoc(doc(db, "vendas", name), {});
    showMessage("Funcionário removido com sucesso!", "success");
    renderEmployeeManagement();
  }
}

// 💬 Mensagens
function showMessage(text, type) {
  const existingMessage = document.querySelector(".message");
  if (existingMessage) existingMessage.remove();

  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;

  const loginForm = document.querySelector(".login-form");
  const adminPanel = document.querySelector(".admin-panel");

  if (document.getElementById("login-section").style.display !==