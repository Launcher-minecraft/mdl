const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const SERVER_URL = "http://mdl-app.ddns.net:3000";

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.static('public'));

// Charger utilisateurs
let users = JSON.parse(fs.readFileSync('users.json', 'utf8'));

// Charger stock
let stockData = JSON.parse(fs.readFileSync('stock.json', 'utf8'));

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if(user && bcrypt.compareSync(password, user.password)){
    return res.json({ success: true });
  }
  res.json({ success: false });
});

// Get stock
app.get('/stock', (req, res) => {
  res.json(stockData);
});

// Update stock
app.post('/update-stock', (req, res) => {
  const { type, name, quantite, prix } = req.body;
  if(stockData.stock[type] && stockData.stock[type][name]){
    stockData.stock[type][name].quantite = quantite;
    stockData.stock[type][name].prix = prix;
    fs.writeFileSync('stock.json', JSON.stringify(stockData, null, 2));
    return res.json({ success: true });
  }
  res.json({ success: false });
});

// Update status
app.post('/update-status', (req, res) => {
  const { ouvert } = req.body;
  stockData.ouvert = ouvert;
  fs.writeFileSync('stock.json', JSON.stringify(stockData, null, 2));
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MDL App running at ${SERVER_URL}`);
});
