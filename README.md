# 🧸 ToyStore VulnLab — Intentionally Vulnerable E‑commerce App (Local Training Lab)

> **ToyStore VulnLab** is a deliberately insecure, Amazon‑style toy shopping web app built for **learning Web App VAPT** through hands‑on practice.  
> Run it locally, break it safely, and sharpen your skills against **OWASP Top 10** issues using real workflows: login, cart, checkout, admin panel, and more.

---

## ✨ Why this repo exists

Security skills improve fastest when you can **see the bug, exploit it, and then fix it**.

This project is designed as a **controlled vulnerable lab** where you can:

- Practice **Web Application Penetration Testing**
- Reproduce **real-world vulnerability patterns**
- Learn how bugs behave in **auth, sessions, API calls, DB queries**
- Improve both **attacker mindset** + **defender thinking**

✅ **Perfect for:** Students • Bug bounty beginners • VAPT practice • OWASP Top 10 training  
⚠️ **Not for production use.**

---

## 🧩 What you get inside

ToyStore VulnLab includes typical e‑commerce modules:

- User signup / login / sessions
- Product listing + search
- Cart & checkout flow
- Orders / payments simulation
- Admin panel features (intentionally unsafe in places)
- Dockerized DB initialization

---

## 🎯 Vulnerabilities covered (OWASP-aligned)

This lab intentionally contains vulnerable patterns based on OWASP Top 10:

- ✅ Injection (SQLi-like patterns / unsafe queries)
- ✅ Broken Access Control (IDOR / missing role checks)
- ✅ Identification & Authentication failures
- ✅ Security Misconfiguration
- ✅ Insecure Design decisions (by intention)
- ✅ Data exposure / weak validation flows
- ✅ Logging gaps / monitoring weaknesses

📌 See: **`VULNERABILITY_MATRIX.md`** for the full list + mapping.

---

## 🏗️ Tech Stack

- **Node.js / Express** (server)
- **PostgreSQL** (database)
- **Docker + Docker Compose** (local environment)
- **SQL init scripts** in `/db`

---

## 🚀 Quick Start (Recommended)

### 1) Requirements

Make sure you have:

- Docker + Docker Compose installed
- Node.js (optional if you run only via Docker)

### 2) Run the lab

```bash
git clone <your-repo-url>
cd toy-store-vuln-COMPLETE
docker compose up --build
```

The app will start locally (check terminal output for the exact port).

✅ You can also use the included start scripts:

```bash
chmod +x start.sh
./start.sh
```

or

```bash
chmod +x start-simple.sh
./start-simple.sh
```

---

## 🔐 Default accounts (if seeded)

Some builds may insert demo users during DB init.

If you don’t see credentials mentioned on startup, check:

- `SETUP.md`
- `db/init.sql`

---

## 📚 How to use this repo (Training Workflow)

### ✅ Beginner path (safe + structured)

1. Start the lab locally
2. Open **`TESTING_GUIDE.md`**
3. Follow modules in order:
   - Authentication testing
   - Authorization / access control
   - Input validation & injection
   - Session management
   - Admin routes
4. Document findings like a real report:
   - **Impact**
   - **Steps to reproduce**
   - **Payload**
   - **Fix recommendation**

### ✅ Tools you can practice with

You can test this lab using:

- Browser DevTools
- Burp Suite / OWASP ZAP
- curl / httpie
- sqlmap (only locally)
- Nmap (localhost only)
- Custom scripts

---

## 🧪 Local testing notes

This repo is meant to run only in a **local isolated environment**:

✅ Allowed:
- Localhost scanning
- Docker network traffic inspection
- Testing payloads for learning

❌ Not allowed:
- Deploying publicly
- Scanning external targets
- Using it against systems you don’t own

---

## 📂 Repo structure (high level)

```text
toy-store-vuln-COMPLETE/
├── web-app.js                  # Main Node.js app
├── docker-compose.yml          # App + DB containers
├── Dockerfile                  # App image build
├── db/
│   └── init.sql                # Database schema + seed data
├── SETUP.md                    # Setup & environment info
├── TESTING_GUIDE.md            # Step-by-step testing guide
├── VULNERABILITY_MATRIX.md     # Vulnerability mapping table
├── UPDATES.md                  # Change log / updates
└── start.sh / start-simple.sh  # Quick run scripts
```

---

## 🛡️ Fixing mode (optional challenge)

Want to level up?

After finding vulnerabilities, try to **patch the app**:

- Sanitize + validate user input
- Add server-side authorization checks
- Use parameterized queries everywhere
- Lock down admin routes
- Improve error handling & logging
- Add rate-limiting / basic security headers

Then compare your fixes with secure coding best practices.

---

## 🧾 Documentation

Useful project docs included in this repo:

- **`SETUP.md`** → Setup steps & environment details  
- **`TESTING_GUIDE.md`** → VAPT walkthrough tasks  
- **`VULNERABILITY_MATRIX.md`** → Vulnerabilities + OWASP mapping  
- **`UPDATES.md`** → Changes & version notes  

---

## 🤝 Contributing

This is a learning repo — contributions are welcome:

- Add new vulnerable modules (with labels)
- Improve documentation clarity
- Add fixes behind a secure branch
- Improve DB seed data and realism

✅ Please keep vulnerabilities **intentional and documented**.

---

## 📜 License & Disclaimer

**Educational use only.**  
This project is intentionally vulnerable and must be used only in controlled environments.

By using this repo, you agree that:
- You will not deploy it publicly
- You will use it only for legal, ethical practice
- You are responsible for your own actions

---

## ⭐ If this helped you

If you learned something from this project:

- Star the repo ⭐
- Share it with your security friends 🧠🔒
- Build your own “secure version” fork 🛠️

---

Happy (ethical) hacking! 🧸🔥
