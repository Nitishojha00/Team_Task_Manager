# TaskFlow — Team Task Manager

> A full-stack collaborative project management web app with role-based access control, kanban boards, real-time task tracking, and an analytics dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-FB015B?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Railway](https://img.shields.io/badge/Deployed-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)

---

## Live Demo

| Resource | Link |
|----------|------|
| **Live App** | `https://your-app.railway.app` *(update after deploy)* |
| **GitHub Repo** | `https://github.com/yourusername/team-task-manager` |
| **Demo Video** | `https://your-video-link-here` |

---

## Features

### Authentication
- Secure signup and login with JWT tokens
- Passwords hashed with bcryptjs (12 salt rounds)
- Session persists across page reloads via localStorage
- Protected routes — all API endpoints require a valid token

### Project Management
- Create, update, and delete projects with custom colors
- Invite team members by email address
- Assign roles — **Admin** or **Member** — per project
- Admin-only: edit project settings, manage members, delete project
- Owner-only: permanently delete a project and all its tasks

### Task Tracking
- Full CRUD on tasks within projects
- Four statuses: `To Do` → `In Progress` → `Review` → `Done`
- Four priority levels: `Low`, `Medium`, `High`, `Urgent`
- Assign tasks to project members, set due dates, add descriptions
- Comment threads on every task

### Views
- **Kanban board** — drag-free column view grouped by status
- **List view** — filterable flat list of all tasks
- **All Tasks page** — search and filter across all projects by status, priority, assignee
- **Overdue page** — all past-due tasks that aren't marked done

### Dashboard
- Stats cards: total tasks, tasks assigned to me, overdue count, completion percentage
- Tasks by status bar chart
- Open tasks by priority bar chart
- Recent tasks list
- My projects quick-nav

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JSON Web Tokens (JWT) |
| Validation | express-validator |
| Deployment | Railway |

---

## Project Structure

```
Team_Task_Manager/
├── Backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── middleware/
│   │   └── auth.js             # JWT protect + role guards
│   ├── models/
│   │   ├── User.js             # User schema (bcrypt, avatarColor)
│   │   ├── Project.js          # Project schema (members, roles)
│   │   └── Task.js             # Task schema (comments, isOverdue virtual)
│   ├── routes/
│   │   ├── auth.js             # POST /signup /login, GET/PUT /me
│   │   ├── projects.js         # Full CRUD + member management
│   │   ├── tasks.js            # Full CRUD + comments + dashboard
│   │   └── users.js            # User search by email/name
│   ├── .env                    # Environment variables (not committed)
│   ├── .env.example            # Environment variable template
│   ├── package.json
│   └── server.js               # Express app entry point
│
└── Frontend/
    ├── index.html              # App shell, router, state
    ├── styles.css              # All styles (CSS variables, dark theme)
    ├── api.js                  # Centralised fetch wrapper
    ├── utils.js                # Helpers: toast, avatar, dates, icons
    ├── auth.js                 # Login / signup UI
    ├── sidebar.js              # Sidebar + project nav renderer
    ├── dashboard.js            # Dashboard page renderer
    ├── projects.js             # Projects page, kanban, members tab
    └── tasks.js                # Tasks page, create/edit/detail modals
```

---

## Local Setup

### Prerequisites
- Node.js 18 or higher
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/team-task-manager.git
cd team-task-manager
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/taskflow
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=
```

**Getting `MONGO_URI`:**
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click your cluster → **Connect** → **Drivers**
3. Copy the connection string and replace `<password>` with your database user's password

**Generating `JWT_SECRET`:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start the backend server

```bash
npm run dev       # development (nodemon)
# or
npm start         # production
```

Server runs at `http://localhost:5000`

### 5. Open the frontend

Open `Frontend/index.html` directly in your browser, or serve it with any static file server:

```bash
npx serve Frontend
```

> The frontend's `api.js` automatically points to `http://localhost:5000/api` in development and to `/api` in production (when served by Express).

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` | Create account |
| POST | `/api/auth/login` | `{ email, password }` | Login, receive JWT |
| GET | `/api/auth/me` | — | Get current user |
| PUT | `/api/auth/me` | `{ name?, avatarColor? }` | Update profile |

### Projects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | Any member | List my projects |
| POST | `/api/projects` | Authenticated | Create project |
| GET | `/api/projects/:id` | Member | Get project + role |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Owner | Delete project + tasks |
| POST | `/api/projects/:id/members` | Admin | Add member by email |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |
| PUT | `/api/projects/:id/members/:userId/role` | Admin | Change member role |

### Tasks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tasks` | Member | List tasks (filters: project, status, priority, assignee, overdue, search) |
| GET | `/api/tasks/dashboard` | Authenticated | Dashboard stats + charts data |
| GET | `/api/tasks/:id` | Member | Get task details + comments |
| POST | `/api/tasks` | Member | Create task |
| PUT | `/api/tasks/:id` | Member | Update task |
| DELETE | `/api/tasks/:id` | Creator or Admin | Delete task |
| POST | `/api/tasks/:id/comments` | Member | Add comment |

---

## Role-Based Access Control

| Action | Member | Admin | Owner |
|--------|--------|-------|-------|
| View project & tasks | ✅ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ✅ |
| Update any task | ✅ | ✅ | ✅ |
| Delete own tasks | ✅ | ✅ | ✅ |
| Delete any task | ❌ | ✅ | ✅ |
| Edit project settings | ❌ | ✅ | ✅ |
| Add / remove members | ❌ | ✅ | ✅ |
| Change member roles | ❌ | ✅ | ✅ |
| Delete project | ❌ | ❌ | ✅ |

---

## Deployment on Railway

### 1. Push to GitHub
```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Create a Railway project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

### 3. Set environment variables
In the Railway dashboard, go to your service → **Variables** → add:

```
MONGO_URI        = mongodb+srv://...
JWT_SECRET       = your_secret
JWT_EXPIRES_IN   = 7d
NODE_ENV         = production
PORT             = 5000
FRONTEND_URL     = https://your-app.railway.app
```

### 4. Set the start command
In **Settings** → **Deploy** → **Start Command**:
```
node Backend/server.js
```

### 5. Deploy
Railway auto-deploys on every push to `main`. Your app will be live at `https://your-app.railway.app`.

> In production, Express serves the `Frontend/` folder as static files. Both the API and the frontend run from the same Railway service — no separate deployment needed.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | ✅ | Token expiry (e.g. `7d`, `24h`) |
| `PORT` | ✅ | Server port (Railway sets this automatically) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `FRONTEND_URL` | Optional | Restrict CORS to this origin in production |

---

## Screenshots

> *(Add screenshots of dashboard, kanban board, and task detail modal here)*

---

## Author

**Nitish** — built as part of a full-stack assignment

---

## License

This project is for educational purposes.