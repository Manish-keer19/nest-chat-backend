# SocialApp Backend API

This is the robust backend server for the **SocialApp** platform, built with **NestJS**. It powers the real-time WebSocket infrastructure, handles secure authentication, and manages data persistence for the next-generation social experience.

## 🚀 Key Features

*   **Real-time Gateway**:
    *   **Socket.io Integration**: High-performance event handling for chat and signaling.
    *   **Random Chat Matching**: Advanced queue logic for connecting users instantly.
    *   **Signaling Server**: Handles WebRTC Offer/Answer/ICE Candidate exchange for P2P connections.
    *   **Optimization**: Implements ICE candidate batching and stale connection cleanup.
*   **Authentication & Security**:
    *   **Strategies**: JWT, Google OAuth, GitHub OAuth.
    *   **Guards**: Role-based access control and protected routes.
*   **Database & ORM**:
    *   **Prisma ORM**: Type-safe database access.
    *   **PostgreSQL**: Reliable relational database storage.
*   **API Architecture**:
    *   RESTful endpoints for user management and resource handling.
    *   Modular structure (Auth, User, Chat, Call modules).

## 🛠️ Tech Stack

*   **Framework**: NestJS (Node.js)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Real-time**: Socket.io
*   **Containerization**: Docker & Docker Compose

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd backend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env` file in the root of the backend directory:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/social_app?schema=public"
    JWT_SECRET="your_super_secret_key"
    FRONTEND_URL="http://localhost:5173"
    GOOGLE_CLIENT_ID="..."
    GOOGLE_CLIENT_SECRET="..."
    GITHUB_CLIENT_ID="..."
    GITHUB_CLIENT_SECRET="..."
    ```

4.  **Database Setup**:
    Start the database using Docker:
    ```bash
    docker-compose up -d db
    ```
    Push the schema to the database:
    ```bash
    npx prisma db push
    ```

5.  **Run Development Server**:
    ```bash
    npm run start:dev
    ```
    The API will be available at `http://localhost:3000`.

## 🗄️ Database Schema

The database is designed to handle complex social relationships:
*   **Users**: Detailed profiles with auth provider links.
*   **Conversations**: Supports both private (1:1) and group chats.
*   **Messages**: Text and rich media attachments.
*   **Calls**: Detailed tracking of call logs, participants, and duration.
*   **Friendships**: Follower/Following model.

## 🤝 Contributing

We welcome contributions! Please follow the NestJS coding style and ensure all tests pass before submitting a PR.
