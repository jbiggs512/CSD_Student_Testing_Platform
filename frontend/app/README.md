# Altius Frontend

React 19, TypeScript, and Vite frontend for the CSD Student Testing Platform.

## Getting Started

From this directory:

```bash
npm install
npm run dev
```

The development server is available at the URL printed by Vite.

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Type-check and build for production
npm run lint     # Run Oxlint
npm run preview  # Preview the production build
```

## Source Structure

The project uses a lightweight version of Feature-Sliced Design. Layers are added as the application grows, without creating empty folders or ceremony up front.

```text
src/
├── app/                  # Application entry point and global styles
│   ├── styles/
│   ├── App.tsx
│   └── index.ts
├── pages/                # Route-level pages
│   ├── landing/
│   ├── login/
│   └── register/
├── shared/               # Reusable, domain-agnostic code
│   ├── api/              # Shared API client
│   ├── components/       # Shared UI and shadcn components
│   └── config/           # Environment variables and configuration
└── main.tsx              # Application entry point
```

Import from the lowest layer that owns the code. Shared code must stay domain-agnostic, while page-specific code belongs in its page slice. Add `entities`, `features`, or `widgets` only when the application needs those layers.

## Path Aliases

Configured in `vite.config.ts` and `tsconfig.app.json`:

- `@/*` -> `src/*`
- `@app/*` -> `src/app/*`
- `@shared/*` -> `src/shared/*`
