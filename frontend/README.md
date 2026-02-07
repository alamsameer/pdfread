# DDF PDF Reader Frontend

A modern, high-performance PDF reading application built with Next.js 14, React, and TypeScript. This frontend application provides a clean, distraction-free reading experience with features for highlighting and annotating documents.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛠 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching:** [TanStack Query](https://tanstack.com/query/latest) & Axios
- **Icons:** [Lucide React](https://lucide.dev/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) (primitives)

## 📂 Project Structure

```
frontend/
├── app/                  # Next.js App Router pages and layouts
│   ├── reader/           # PDF Reader route (e.g., /reader/[docId])
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page / Dashboard
├── components/           # React components
│   ├── layout/           # Layout components (Header, Sidebar)
│   ├── reader/           # Reader-specific components (PDFViewer, HighlightMenu)
│   ├── ui/               # Reusable UI components
│   └── upload/           # File upload components
├── lib/                  # Utility functions and shared logic
├── styles/               # Global styles
└── public/               # Static assets
```

## ✨ Key Features

- **PDF Rendering:** Fast and responsive PDF viewing.
- **Text Highlighting:** Select and highlight text with custom colors.
- **Modern UI:** Clean, minimalist interface designed for reading comfort.
- **Responsive Design:** Optimized for various screen sizes.

## 📜 Scripts

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production.
- `npm start`: Starts the production server.
- `npm run lint`: Runs the linter to catch code issues.

