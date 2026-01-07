# Cursor Projects Manager - Backend

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres123@10.66.7.5:5432/cursor-multiple-projects-manage?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-change-this-key-to-something-very-random"
JWT_EXPIRE="7d"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"
```

## Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Run database migrations (if needed)
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio
npm run db:studio
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - Get all projects for current user
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/details` - Get project with tasks and AI executions

### Tasks
- `GET /api/tasks/project/:projectId` - Get tasks for a project
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/order` - Update task order (drag & drop)

### AI Status (Project-based)
- `PUT /api/projects/:id/ai-status` - Update AI execution status for a project
- `GET /api/projects/ai-status/running` - Get projects with running AI executions

## WebSocket Events

### Client to Server
- `ai-status-update` - Broadcast AI status updates

### Server to Client
- `ai-status-updated` - Receive AI status updates
