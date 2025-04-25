# Stack Visualization Tool

An interactive web application for visualizing stack data structure operations. This tool helps users understand how stack operations (push, pop, peek) work through visual representation.

## Features

- Visual representation of stack elements
- Push operation with animation
- Pop operation with visual feedback
- Peek operation to view the top element
- Responsive design
- Clean and modern UI

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Building for Production

1. Create a production build:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

## Deployment

The project is configured for easy deployment to various platforms:

### Static Hosting (Netlify, Vercel, GitHub Pages)
- The `dist` folder contains the production build
- Configure your hosting platform to:
  - Use `npm run build` as the build command
  - Set `dist` as the publish directory

### Manual Deployment
1. Run `npm run build`
2. Upload the contents of the `dist` folder to your web server

## Technology Stack

- React
- TypeScript
- Vite
- CSS3 with animations 