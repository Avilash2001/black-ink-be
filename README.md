<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
  &nbsp;&nbsp;&nbsp;
  <span style="font-size: 40px;">⚔️</span>
  &nbsp;&nbsp;&nbsp;
  <span style="font-size: 40px;">🤖</span>
</p>

<h1 align="center">Black Inkk Backend</h1>

<p align="center">
  The engine powering infinite worlds, interactive storytelling, and AI-driven destiny. 
  <br />
  Build your own "Choose Your Own Adventure" - but the choices are limitless.
</p>

<p align="center">
  <a href="https://nodejs.org/" target="_blank"><img src="https://img.shields.io/badge/Node.js-green?style=flat-square&logo=node.js" alt="Node.js" /></a>
  <a href="https://nestjs.com/" target="_blank"><img src="https://img.shields.io/badge/NestJS-red?style=flat-square&logo=nestjs" alt="NestJS" /></a>
  <a href="https://www.mongodb.com/" target="_blank"><img src="https://img.shields.io/badge/MongoDB-green?style=flat-square&logo=mongodb" alt="MongoDB" /></a>
  <a href="https://mongoosejs.com/" target="_blank"><img src="https://img.shields.io/badge/Mongoose-brown?style=flat-square" alt="Mongoose" /></a>
  <img src="https://img.shields.io/badge/AI-Powered-blue?style=flat-square" alt="AI Powered" />
</p>

---

## 🧐 What is this?

**Black Inkk Backend** is the RESTful API and core logic for a dynamic text-based adventure game. It uses Generative AI to craft unique stories on the fly, reacting to user inputs in real-time.

Instead of static decision trees, this backend manages:

- **Story Generation**: Creating narrative arcs based on genre, protagonist, and setting.
- **Dynamic Turns**: Processing user actions (Do, Say, See) and generating consequences.
- **State Management**: Keeping track of the story so far to maintain consistency.

## 🚀 Why does it exist?

We wanted to push the boundaries of interactive fiction. Traditional games are limited by what the developer wrote. **Black Inkk** breaks those chains!

It acts as a **Dungeon Master** that never sleeps, allowing players to:

- Be anyone they want.
- Go anywhere they can imagine.
- Experience a story that has never been told before and will never be told again.

## 🗺️ Repo Walkthrough

Here's how the magic is organized under the hood:

```
src/
├── ai/          # 🧠 The Brain - Handles prompts and communication with the AI model.
├── auth/        # 🛡️ The Gatekeeper - User registration, login, and secure sessions.
├── stories/     # 📜 The Chronicles - Managing story entities, turns, and nodes.
├── app.*        # 🏗️ Core NestJS application setup.
└── main.ts      # 🏁 The Entry Point.
```

### Key Concepts

- **Stories**: The container for a single adventure. Contains metadata like genre and protagonist.
- **Story Nodes**: Individual "pages" or "turns" of the story. Linked together to form the narrative chain.
- **Users**: The players embarking on these adventures.

## � Frontend

Looking for the frontend? Check out the NextJS-based client here:
[**Black Ink Frontend Repository**](https://github.com/Avilash2001/black-ink-fe)

## �🛠️ Installation & Setup

Ready to run your own world engine? Follow these steps:

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **pnpm** (because it's fast and efficient)
- **MongoDB** running locally or a connection string to Atlas

### Step 1: Clone the Repo

```bash
git clone https://github.com/your-username/ai-adventure-be.git
cd ai-adventure-be
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Environment

Create a `.env` file in the root directory (copy `.env.example` if it exists) and add your secrets:

```env
MONGO_URI=mongodb://localhost:27017/ai-adventure
AI_API_KEY=your_ai_api_key_here
JWT_SECRET=super_secret_key
PORT=3000
```

### Step 4: Run the App

```bash
# Development mode (watch)
pnpm run start:dev

# Production mode
pnpm run start:prod
```

The server usually starts on `http://localhost:3000`.

## 🤝 Contributing

**We want YOU!** 🫵

This project is open for adventurers, code wizards, and prompt engineers. Whether you want to improve the AI prompts, optimize database queries, or add a whole new multiplayer mode, we welcome your contributions.

### How to contribute:

1.  **Fork** the repository.
2.  **Create** a new branch (`git checkout -b feature/epic-feature`).
3.  **Commit** your changes (`git commit -m 'Add epic feature'`).
4.  **Push** to the branch (`git push origin feature/epic-feature`).
5.  **Open a Pull Request** and tell us what you built!

---

<p align="center">
  <i>Adventure awaits. Will you code your destiny?</i>
</p>
