# IT Help Desk & Asset Management System

An internal IT Help Desk and Asset Management web app: employees report IT problems via tickets, IT staff triage, assign, resolve and document them, and admins manage users, company equipment and reporting.

Built as a portfolio project with **React + TypeScript (Vite)**, **Node.js + Express + TypeScript**, **MongoDB (Mongoose)**, **Tailwind CSS**, JWT auth, and Nodemailer notifications.

## Features

- **Ticket management** — create, assign, prioritize, comment (public + internal notes), attach files, status workflow, reopen, SLA due dates
- **Asset management** — asset register with tags/serials, assignment to employees with full history, maintenance records, warranty tracking
- **Dashboards & reports** — role-specific dashboards, charts (tickets over time, by category/priority, resolution times, top problem assets), CSV export
- **Knowledge base** — searchable troubleshooting guides with helpfulness votes
- **Auth & roles** — JWT with refresh cookies, forgot/reset password by email, three roles: admin / IT staff / employee
- **Notifications** — in-app bell + email on assignment, comments and status changes
- **Audit logs** — every important action recorded and viewable by admins
- **Extras** — dark mode, responsive layout, seed data, API hardening (helmet, rate limiting, validation)

## Project structure

```
├── client/          React + Vite + Tailwind frontend
├── server/          Express + Mongoose API
├── docker-compose.yml  Local MongoDB (optional)
└── package.json     Root scripts (concurrently)
```

## Getting started

### Prerequisites

- Node.js 20+
- MongoDB — either [Docker](https://www.docker.com/) (`docker compose up -d`) or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)

### Setup

```bash
npm run install-all        # installs root, server and client dependencies

cp server/.env.example server/.env   # then edit MONGODB_URI / secrets

npm run seed               # demo users, departments, tickets, assets
npm run dev                # API on :5001, client on :5173
```

### Demo accounts (after seeding)

| Email | Role | Password |
|---|---|---|
| admin@demo.com | Admin | Password123! |
| itstaff@demo.com | IT Staff | Password123! |
| employee@demo.com | Employee | Password123! |

Email notifications use an [Ethereal](https://ethereal.email) test account in development — preview links are printed to the server console.

## Scripts

| Where | Command | Purpose |
|---|---|---|
| root | `npm run dev` | Run API + client together |
| root | `npm run seed` | Seed the database |
| root | `npm run build` | Build server + client |
| server | `npm run dev` | API only (tsx watch) |
| client | `npm run dev` | Client only (Vite) |

## License

MIT
