# GameOne

A React-based website featuring a Phaser 3 game.

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gameone
```

2. Install dependencies:
```bash
npm install
```

## Running the Development Server

To start the development server:

```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Building for Production

To create a production build:

```bash
npm run build
```

The build files will be created in the `build` directory.

## Project Structure

- `web/` - Contains all web-related files
  - `src/` - Source code
    - `components/` - React components
    - `App.tsx` - Main application component
    - `Game.tsx` - Phaser game component
  - `public/` - Static files