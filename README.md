# CertaChain

<div align="center">
  <h3>The trust layer for African education</h3>
  <p>Credential issuance, student ownership, and employer verification in one Solana-oriented workflow.</p>
  <p>
    <strong>Frontend:</strong> React + Vite
    <strong> | </strong>
    <strong>Backend:</strong> Node.js + Express
    <strong> | </strong>
    <strong>Storage:</strong> IPFS via Pinata
    <strong> | </strong>
    <strong>AI:</strong> Gemini
  </p>
</div>

## Overview

CertaChain is a monorepo for a credential platform built around three users:

- Institutions issue verifiable certificates with optional PDF or image uploads.
- Students access credentials through a wallet flow or an email-based custodial claim flow.
- Employers verify credentials and generate AI-assisted skill reports from verified evidence.

The current codebase focuses on the application layer that makes this possible:

- multi-portal onboarding
- credential issuance APIs
- IPFS file and metadata storage
- student wallet and email-claim flows
- employer verification by wallet, profile link, or certificate ID
- Gemini-powered skill analysis from credential metadata and uploaded files

## Why It Matters

Manual credential verification is slow, expensive, and easy to game. For schools, that means administrative friction. For students, it means weaker proof of real achievement. For employers, it means hiring risk.

CertaChain is designed to reduce that friction by turning certificate verification into a fast product workflow instead of a long back-office process.

## What The App Does

### 1. Institution Portal

Institutions can:

- connect a Solana wallet
- choose between direct wallet issuance or email-based issuance
- upload certificate files as PDF or image
- generate metadata for each certificate
- store the uploaded asset and metadata on IPFS
- save the certificate record in PostgreSQL through Prisma

Relevant UI and API flow:

- [`frontend/src/pages/IssueCertificate.jsx`](/C:/Users/USER/Desktop/hackathon/certachain/frontend/src/pages/IssueCertificate.jsx:1)
- [`backend/index.js`](/C:/Users/USER/Desktop/hackathon/certachain/backend/index.js:1)

### 2. Student Portal

Students can:

- create a profile through the portal flow
- connect a wallet and load credentials tied to that wallet
- recover email-issued credentials by supplying their email and certificate ID
- claim a custodial wallet from a secure tokenized email link
- share a public profile-style credential view

Relevant UI and API flow:

- [`frontend/src/pages/StudentProfile.jsx`](/C:/Users/USER/Desktop/hackathon/certachain/frontend/src/pages/StudentProfile.jsx:1)
- [`frontend/src/pages/EmailCredentialViewer.jsx`](/C:/Users/USER/Desktop/hackathon/certachain/frontend/src/pages/EmailCredentialViewer.jsx:1)
- [`frontend/src/pages/ClaimCredentials.jsx`](/C:/Users/USER/Desktop/hackathon/certachain/frontend/src/pages/ClaimCredentials.jsx:1)

### 3. Employer Verification Portal

Employers can:

- verify using a wallet address
- verify using a profile link
- verify using a certificate ID
- attach an optional job description
- generate a structured AI skill report with summary, verified skills, strongest areas, skill gaps, score, and recommendation

The verifier also attempts to analyze uploaded certificate evidence:

- PDF files are parsed for text
- image files are passed into Gemini as multimodal input

Relevant UI and API flow:

- [`frontend/src/pages/SkillVerifier.jsx`](/C:/Users/USER/Desktop/hackathon/certachain/frontend/src/pages/SkillVerifier.jsx:1)
- [`backend/index.js`](/C:/Users/USER/Desktop/hackathon/certachain/backend/index.js:1)

## Repository Structure

```text
certachain/
|-- backend/     # Express API, Prisma, issuance, verification, email claim flow
|-- frontend/    # React app with institution, student, and employer portals
|-- package.json # Monorepo helper scripts
|-- vercel.json  # Vercel multi-service routing
```

## Tech Stack

| Layer | Technology | Use |
|---|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS | Multi-portal web app |
| Wallet UX | Solana Wallet Adapter | Student and institution wallet connectivity |
| Backend | Node.js, Express | API and business logic |
| Database | Prisma + PostgreSQL | Certificate and custodial wallet records |
| File Handling | Multer | In-memory certificate upload processing |
| Storage | Pinata + IPFS | File and metadata hosting |
| AI | Google Gemini 2.5 Flash | Skill report generation |
| Email | Nodemailer | Claim-link delivery |
| Validation | Zod | Request validation |

## How It Works

### Issuance Flow

1. An institution fills the issuance form and optionally uploads a certificate file.
2. The backend stores the file on IPFS if one is attached.
3. The backend generates certificate metadata and pins that metadata to IPFS.
4. A certificate record is created in PostgreSQL.
5. If the institution issues by email, a custodial wallet and claim token are generated and emailed to the student.

### Verification Flow

1. An employer submits a wallet address, certificate ID, or shared profile link.
2. The backend resolves the certificate set associated with that identity.
3. Metadata is hydrated from IPFS gateway URLs.
4. Gemini produces a structured skill report using verified credential data and any recoverable uploaded evidence.

### Student Claim Flow

1. A student receives an email claim link or enters an email and certificate ID manually.
2. The backend resolves the custodial wallet tied to that email.
3. The student can open a credential profile using the issued wallet address.

## API Overview

These are the main routes currently implemented in [`backend/index.js`](/C:/Users/USER/Desktop/hackathon/certachain/backend/index.js:1):

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/certificates/issue` | Issue a certificate, upload file, pin metadata, optionally trigger email claim flow |
| `GET` | `/api/certificates/verify/:certId` | Verify a certificate by certificate ID |
| `GET` | `/api/students/:walletAddress/credentials` | Fetch credentials for a wallet |
| `POST` | `/api/students/email-credentials` | Recover credentials for email-issued students |
| `POST` | `/api/ai/skill-report` | Generate a Gemini skill report |
| `POST` | `/api/users/claim` | Create a custodial wallet and send a claim email |
| `GET` | `/api/users/claim/:token` | Resolve a tokenized claim link |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/certificates` | List recent certificates |

## Data Model

The Prisma schema currently contains two main models:

- `Certificate`
  - certificate ID
  - institution wallet
  - optional student wallet
  - student name
  - course
  - IPFS metadata URL
  - IPFS file URL
  - issue date
- `CustodialWallet`
  - student email
  - generated public key
  - private key
  - claim token

See:

- [`backend/prisma/schema.prisma`](/C:/Users/USER/Desktop/hackathon/certachain/backend/prisma/schema.prisma:1)

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- Pinata API credentials
- Gemini API key
- Gmail or SMTP credentials for claim email delivery

### 1. Install dependencies

From the repo root:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

You can also use the root helper scripts in [`package.json`](/C:/Users/USER/Desktop/hackathon/certachain/package.json:1).

### 2. Configure environment variables

Create your own local `.env` files.

Frontend example:

```env
VITE_API_BASE_URL=http://localhost:5050/api
```

Backend example:

```env
PORT=5050
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email_account
EMAIL_PASS=your_email_app_password
CLIENT_APP_URL=http://localhost:5173
SOLANA_PROGRAM_ID=your_program_id
SOLANA_PROGRAM_OWNER=optional
SOLANA_PROGRAM_DATA_ADDRESS=optional
SOLANA_PROGRAM_AUTHORITY=optional
SOLANA_PROGRAM_LAST_DEPLOYED_SLOT=optional
SOLANA_PROGRAM_DATA_LENGTH=optional
SOLANA_PROGRAM_BALANCE_SOL=optional
SOLANA_CLUSTER=devnet
```

### 3. Run Prisma

From `backend/`:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Start the apps

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

You can also use the root scripts:

```bash
npm run dev:backend
npm run dev:frontend
```

## Deployment Notes

- The repo includes a [`vercel.json`](/C:/Users/USER/Desktop/hackathon/certachain/vercel.json:1) file configured for a two-service Vercel setup.
- The frontend is served at `/`.
- The backend is mounted behind `/_/backend`.
- The frontend API helper automatically switches between local development and the Vercel backend prefix.

## Current Strengths

- Clean multi-portal UX for institutions, students, and employers
- Real file upload and decentralized storage flow
- Email-based fallback for students without wallets
- Verification supports multiple lookup types
- AI reports use both credential metadata and file evidence when available

## Current Limitations

- There are no automated tests in the repo yet.
- Secrets should not be committed in `.env` files.
- The current codebase is strongest at the app and verification layer; if you want the README to claim full on-chain anchoring or minting, that should be backed by explicit transaction/program-write logic in the repository.

## Team

- Ideator and PM: Adeshina Eniola AbdulRokeeb
- Frontend: Baruwa Ridwanullah
- Backend: Olumide Michelle
- Blockchain: AbdulGaniy Habeebulah

## Pitch

CertaChain is built for a simple outcome: make it easier for genuine achievement to travel faster than fraud.

It gives institutions a better issuance workflow, gives students a portable proof layer, and gives employers a faster way to verify real competence.
