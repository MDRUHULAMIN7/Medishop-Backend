# 01 — Development Environment Setup

## 1. Required Software

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS+ | Runtime |
| npm | 10+ | Package manager |
| Git | latest | Version control |
| VS Code | latest | Editor |
| MongoDB Compass (optional) | latest | GUI for local DB inspection |
| Postman / Thunder Client / Swagger UI | latest | API testing & interactive documentation |

## 2. Recommended VS Code Extensions

- ESLint
- Prettier — Code Formatter
- MongoDB for VS Code
- Thunder Client
- DotENV
- Error Lens

## 3. Project Initialization

```bash
mkdir medishop-backend && cd medishop-backend
npm init -y
git init
```

## 4. Core Dependency Installation

Install in this order so each layer is ready before the next depends on it.

```bash
# Runtime dependencies
npm install express mongoose dotenv cookie-parser cors helmet compression
npm install jsonwebtoken bcrypt
npm install ioredis
npm install zod
npm install multer cloudinary
npm install socket.io
npm install pino pino-http
npm install express-rate-limit
npm install nodemailer
npm install pdfkit
npm install swagger-ui-express swagger-jsdoc

# Development dependencies
npm install -D typescript ts-node-dev @types/node @types/express
npm install -D @types/jsonwebtoken @types/bcrypt @types/cookie-parser @types/cors @types/multer @types/pdfkit
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
npm install -D eslint prettier eslint-config-prettier
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npm install -D vitest supertest @types/supertest
```

## 5. TypeScript Configuration

```bash
npx tsc --init
```

Key `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src"]
}
```

## 6. ESLint & Prettier

- ESLint enforces code correctness rules (no unused vars, no implicit any, consistent imports).
- Prettier enforces formatting only. ESLint and Prettier must not fight over formatting — disable formatting-related ESLint rules via `eslint-config-prettier`.

## 7. Husky + Commitlint

- Pre-commit hook: run `lint-staged` (ESLint + Prettier on staged files).
- Commit-msg hook: enforce Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npx commitlint --edit \$1" > .husky/commit-msg
```

## 8. npm Scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## 9. Setup Flow Summary

```
Install Node
  ↓
Initialize project
  ↓
Install Express + TypeScript
  ↓
Configure tsconfig, ESLint, Prettier
  ↓
Configure Husky + Commitlint
  ↓
Add npm scripts
  ↓
Ready for Phase 0 (see 11-development-roadmap.md)
```