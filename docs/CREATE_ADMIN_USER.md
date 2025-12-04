# Creating an Admin User

This document provides multiple methods to create an admin user for the HLP Referral System.

## Method 1: Using the API (Recommended for First Admin)

If you need to create the very first admin user, you'll need to temporarily bypass authentication:

### Option A: Create via curl (requires backend container access)

```bash
# SSH into your production server
ssh bessar@135.220.73.22

# Generate password hash
sudo docker exec -it referral-_hlp-backend-1 python3 -c "
import bcrypt
password = 'YourStrongPassword123!'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(hashed)
"

# Copy the hash output, then insert directly into database
sudo docker exec -it referral-_hlp-db-1 psql -U user referral_db -c "
INSERT INTO users (name, username, email, password_hash, role, created_at)
VALUES (
    'System Administrator',
    'admin',
    'admin@hlp.local',
    '\$2b\$12\$PASTE_YOUR_HASH_HERE',
    'admin',
    NOW()
);
"
```

### Option B: Using Python Script (Easiest)

```bash
# SSH into your production server
ssh bessar@135.220.73.22

# Navigate to project directory
cd ~/referral-_hlp

# Run the admin creation script
sudo docker compose exec backend python scripts/create_admin.py
```

Follow the interactive prompts:
- **Username**: `admin` (or your choice)
- **Email**: `admin@hlp.local` (or your email)
- **Password**: Choose a strong password (minimum 8 characters)
- **Name**: `System Administrator` (or your name)
- **Ability**: Leave blank or specify department

---

## Method 2: Direct Database Insert

If you have direct database access:

```bash
# Connect to database container
sudo docker exec -it referral-_hlp-db-1 psql -U user referral_db

# Generate a password hash first (in Python)
# Run this in backend container:
sudo docker exec -it referral-_hlp-backend-1 python3 -c "
import bcrypt
password = 'YourPassword123!'
print(bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'))
"

# Then insert into database with the hash:
INSERT INTO users (name, username, email, password_hash, role, created_at)
VALUES (
    'Admin User',
    'admin',
    'admin@example.com',
    '$2b$12$YOUR_GENERATED_HASH_HERE',
    'admin',
    NOW()
);
```

---

## Method 3: Using API with Existing Admin Token

If you already have an admin account and want to create another:

```bash
# Login to get token
curl -X POST https://api.bessar.work/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "existing_admin",
    "password": "existing_password"
  }'

# Copy the token from response, then create new user
curl -X POST https://api.bessar.work/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@example.com",
    "name": "New Admin",
    "password": "SecurePassword123!",
    "role": "admin"
  }'
```

---

## Method 4: Quick One-Liner (Production)

For quick admin creation on production:

```bash
ssh bessar@135.220.73.22 "cd ~/referral-_hlp && sudo docker compose exec -T backend python scripts/create_admin.py"
```

---

## Verify Admin User Created

```bash
# Check user exists in database
sudo docker exec -it referral-_hlp-db-1 psql -U user referral_db -c "
SELECT id, username, email, name, role, created_at 
FROM users 
WHERE role = 'admin';
"
```

---

## Test Login

After creating the admin user, test the login:

### Via curl:
```bash
curl -X POST https://api.bessar.work/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourPassword123!"
  }'
```

**Expected response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@hlp.local",
    "role": "admin"
  }
}
```

### Via browser:
1. Open https://hlp.bessar.work
2. Login with your admin credentials
3. You should have full access to all features

---

## Troubleshooting

### "User already exists"
```bash
# Check existing users
sudo docker exec -it referral-_hlp-db-1 psql -U user referral_db -c "SELECT username, email FROM users;"

# Delete user if needed
sudo docker exec -it referral-_hlp-db-1 psql -U user referral_db -c "DELETE FROM users WHERE username = 'admin';"
```

### "bcrypt module not found"
```bash
# Install bcrypt in backend container
sudo docker compose exec backend pip install bcrypt
```

### "Database connection failed"
```bash
# Check database is running
sudo docker compose ps db

# Check DATABASE_URL
sudo docker compose exec backend printenv DATABASE_URL
```

### "Invalid credentials" after creation
- Verify password was hashed correctly
- Check user exists: `SELECT * FROM users WHERE username = 'admin';`
- Try resetting password using the script again

---

## Security Best Practices

1. **Use strong passwords**: Minimum 12 characters, mix of upper/lower/numbers/symbols
2. **Unique credentials**: Don't reuse passwords from other systems
3. **Change default username**: Don't use "admin" in production
4. **Enable 2FA**: (if implemented in future)
5. **Limit admin accounts**: Only create what's necessary
6. **Regular audits**: Review admin users periodically

---

## User Roles

The system supports the following roles:
- **admin**: Full access to all features
- **user**: Limited access (default)
- **system**: For automated processes (n8n, etc.)

To change a user's role:
```sql
UPDATE users SET role = 'admin' WHERE username = 'someuser';
```
