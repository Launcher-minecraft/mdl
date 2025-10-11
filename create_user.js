// create_user.js
// Usage: node create_user.js username password
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_PATH = path.join(__dirname, 'users.json');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node create_user.js <username> <password>');
    process.exit(1);
  }
  const [username, password] = args;
  const users = JSON.parse(fs.existsSync(USERS_PATH) ? fs.readFileSync(USERS_PATH,'utf-8') : '[]');

  if (users.find(u => u.username === username)) {
    console.log('User already exists');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  users.push({ username, passwordHash: hash });
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
  console.log(`Created user "${username}"`);
}

main();
