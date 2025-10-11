const SERVER_URL = "http://mdl-app.ddns.net:3000"; // Ton domaine DDNS

// Elements
const loginSection = document.getElementById("login-section");
const stockSection = document.getElementById("stock-section");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginMsg = document.getElementById("login-msg");
const refreshBtn = document.getElementById("refresh-btn");

const statusEl = document.getElementById("status");
const boissonsEl = document.getElementById("boissons");
const nourritureEl = document.getElementById("nourriture");

// Login
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if(!username || !password){
    loginMsg.textContent = "Veuillez remplir tous les champs";
    return;
  }

  fetch(`${SERVER_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      loginSection.style.display = "none";
      stockSection.style.display = "block";
      loadStock();
    } else {
      loginMsg.textContent = "Pseudo ou mot de passe incorrect";
    }
  })
  .catch(err => {
    loginMsg.textContent = "Erreur de connexion au serveur";
    console.error(err);
  });
});

// Actualiser le stock
refreshBtn.addEventListener("click", loadStock);

function loadStock(){
  fetch(`${SERVER_URL}/stock`)
    .then(res => res.json())
    .then(data => {
      // Statut MDL
      statusEl.textContent = data.ouvert ? "MDL ouverte" : "MDL fermée";

      // Boissons
      boissonsEl.innerHTML = "";
      for(let [name, info] of Object.entries(data.stock.boissons)){
        boissonsEl.innerHTML += createItemHTML(name, info.quantite, info.prix);
      }

      // Nourriture
      nourritureEl.innerHTML = "";
      for(let [name, info] of Object.entries(data.stock.nourriture)){
        nourritureEl.innerHTML += createItemHTML(name, info.quantite, info.prix);
      }
    })
    .catch(err => {
      console.error(err);
      statusEl.textContent = "Erreur lors du chargement du stock";
    });
}

// Fonction pour créer HTML d’un item
function createItemHTML(name, quantite, prix){
  return `
    <div class="item">
      <div class="left">
        <div class="name">${name}</div>
        <div class="meta">Quantité: ${quantite} | Prix: ${prix}€</div>
      </div>
    </div>
  `;
}

// Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log("Service Worker enregistré"))
    .catch(err => console.log(err));
}
