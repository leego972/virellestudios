import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const email = 'leego972@gmail.com';
  const password = 'Hello123123';
  const name = 'Lee Gold';
  const openId = `email_${email}`;
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Check if user already exists
  const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
  
  if (rows.length > 0) {
    // Update existing user to admin
    await connection.execute(
      'UPDATE users SET passwordHash = ?, role = ?, name = ? WHERE email = ?',
      [passwordHash, 'admin', name, email]
    );
    console.log('Updated existing user to admin with new password hash');
  } else {
    // Create new admin user
    await connection.execute(
      'INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [openId, name, email, passwordHash, 'email', 'admin']
    );
    console.log('Created new admin user');
  }
  
  // Verify
  const [verify] = await connection.execute('SELECT id, openId, name, email, role FROM users WHERE email = ?', [email]);
  console.log('User:', verify[0]);
  
  await connection.end();
}

main().catch(console.error);
