# Deployment Architecture (Next.js + Vercel + Neon + BetterAuth)

This document describes the **production infrastructure setup** for this
project, including environments, hosting, authentication, database, DNS,
and expected costs.

The goal is to maintain **three isolated environments**:

-   DEV -- local development
-   UAT -- staging / testing
-   PROD -- production

------------------------------------------------------------------------

# Architecture Overview

Users \| v GoDaddy DNS \| \|-- app.yourdomain.com -\> Vercel
(Production) \|-- uat.yourdomain.com -\> Vercel (UAT) \|--
dev.yourdomain.com -\> Optional Dev \| v Next.js App \| \|-- BetterAuth
\| v Neon PostgreSQL \| \|-- production branch \|-- uat branch \|-- dev
branch

------------------------------------------------------------------------

# Technology Stack

  Component            Technology
  -------------------- ----------------------------
  Frontend + Backend   Next.js
  Hosting              Vercel
  Database             Neon (Serverless Postgres)
  Authentication       BetterAuth
  Domain Registrar     GoDaddy
  CI/CD                Vercel Git integration

------------------------------------------------------------------------

# Environment Structure

## Production

URL: https://app.yourdomain.com\
Vercel Environment: production\
Neon Branch: production

Purpose: - live application - real users - production database

------------------------------------------------------------------------

## UAT (User Acceptance Testing)

URL: https://uat.yourdomain.com\
Vercel Environment: uat (custom environment)\
Neon Branch: uat

Purpose: - QA testing - staging before production release -
production-like environment

------------------------------------------------------------------------

## Development

URL: http://localhost:3000\
Neon Branch: dev

Purpose: - developer work - feature development - local testing

Optional hosted dev:

https://dev.yourdomain.com

------------------------------------------------------------------------

# Vercel Setup

## Plan

Use **Vercel Pro**

Cost:

\$20 / month\
Includes \$20 usage credit.

------------------------------------------------------------------------

## Vercel Project Structure

Create **one Vercel project**.

Environments:

-   Production
-   Preview
-   UAT (custom environment)

Branch strategy:

main -\> production\
uat -\> UAT environment\
feature/\* -\> preview deployments

------------------------------------------------------------------------

# Vercel Environment Variables

## Production

BETTER_AUTH_SECRET=... BETTER_AUTH_URL=https://app.yourdomain.com
DATABASE_URL=`<neon-production-url>`{=html} NODE_ENV=production

------------------------------------------------------------------------

## UAT

BETTER_AUTH_SECRET=... BETTER_AUTH_URL=https://uat.yourdomain.com
DATABASE_URL=`<neon-uat-url>`{=html} NODE_ENV=production

------------------------------------------------------------------------

## Development

BETTER_AUTH_SECRET=... BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=`<neon-dev-url>`{=html} NODE_ENV=development

------------------------------------------------------------------------

# Neon Database Setup

Create **one Neon project**

Example:

project: my-app-db

Branches:

production\
uat\
dev

Recommended mapping:

  Environment   Neon Branch
  ------------- -------------
  Production    production
  UAT           uat
  Dev           dev

Each branch generates its **own connection string**.

Example:

DATABASE_URL=postgres://user:pass@neon-host/db?sslmode=require

Advantages of branching:

-   isolated environments
-   safe schema changes
-   staging database
-   quick cloning

------------------------------------------------------------------------

# BetterAuth Setup

BetterAuth runs **inside the Next.js application**.

Benefits:

-   no per-user fees
-   users stored in your database
-   full control over auth

Typical tables:

users\
accounts\
sessions\
verification_tokens

------------------------------------------------------------------------

# GoDaddy DNS Setup

Create DNS records.

## Production

Type: CNAME\
Name: app\
Value: cname.vercel-dns.com

## UAT

Type: CNAME\
Name: uat\
Value: cname.vercel-dns.com

## Optional DEV

Type: CNAME\
Name: dev\
Value: cname.vercel-dns.com

DNS propagation:

5 minutes -- 1 hour typical\
Up to 48 hours globally

------------------------------------------------------------------------

# Deployment Workflow

## Development

Developer pushes feature branch → preview deployment created
automatically.

## UAT

Merge into `uat` branch → deployed to:

https://uat.yourdomain.com

## Production

Merge into `main` branch → deployed to:

https://app.yourdomain.com

------------------------------------------------------------------------

# Estimated Monthly Cost

  Service          Expected Cost
  ---------------- -------------------
  Vercel Pro       \$20
  Neon database    \$5--\$20
  BetterAuth       \$0
  GoDaddy domain   already purchased

Estimated total:

\$25 -- \$40 / month

------------------------------------------------------------------------

# Security Best Practices

-   Never expose production secrets
-   Use separate env vars per environment
-   Do not use production DB for testing
-   Use HTTPS everywhere
-   Use strong secrets

Generate secrets:

openssl rand -base64 32

------------------------------------------------------------------------

# Repository Structure Recommendation

repo/ ├── docs/ │ └── deployment.md ├── app/ ├── components/ ├── lib/
├── db/ ├── .env.local └── README.md

Infrastructure documentation should be stored in:

/docs

------------------------------------------------------------------------

# Summary

This setup provides:

-   isolated environments
-   simple infrastructure
-   low operational overhead
-   production-ready architecture

Stack:

Next.js\
Vercel\
Neon Postgres\
BetterAuth\
GoDaddy domain
