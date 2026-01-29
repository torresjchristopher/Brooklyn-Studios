# Brooklyn Studios - Gemini AI Studio Application

A modern, interactive web application built with React and TypeScript that leverages the Google Gemini API to provide AI-powered conversational capabilities. Features a modular component architecture with service layer integration for seamless AI interaction.

## Overview

Brooklyn Studios is a full-featured AI Studio application that demonstrates best practices in React development, TypeScript type safety, and modern frontend architecture. The application showcases how to build production-ready AI-powered interfaces with clean code organization and responsive design.

## Features

- 🤖 **AI-Powered Conversations** - Leverages Google Gemini API for intelligent responses
- 🎨 **Modern UI** - Responsive, component-driven interface built with React
- 🛡️ **Type Safety** - Full TypeScript implementation for robust development
- 📦 **Modular Architecture** - Service layer pattern for clean separation of concerns
- ⚡ **Optimized Performance** - Vite for fast development and optimized production builds
- 🚀 **Vercel Ready** - Pre-configured for seamless Vercel deployment

## Tech Stack

- **Frontend Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **API Integration**: Google Gemini API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 16.0 or higher
- npm or yarn package manager
- Google Gemini API key

### Installation

1. Clone the repository:
   `ash
   git clone https://github.com/torresjchristopher/Brooklyn-Studios.git
   cd Brooklyn-Studios
   `

2. Install dependencies:
   `ash
   npm install
   `

3. Configure API Key:
   - Create a .env.local file in the root directory
   - Add your Gemini API key:
     `
     VITE_GEMINI_API_KEY=your_api_key_here
     `

4. Run the development server:
   `ash
   npm run dev
   `

5. Open your browser and navigate to http://localhost:5173

## Project Structure

`
brooklyn-studios/
├── src/
│   ├── components/       # React components
│   ├── services/         # API and service layer
│   ├── types.ts          # TypeScript type definitions
│   ├── constants.ts      # Application constants
│   ├── App.tsx           # Main application component
│   └── index.tsx         # Application entry point
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Project dependencies
└── vercel.json           # Vercel deployment configuration
`

## Available Scripts

- 
pm run dev - Start development server with HMR
- 
pm run build - Build for production
- 
pm run preview - Preview production build locally
- 
pm run lint - Run ESLint to check code quality

## Deployment

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set the VITE_GEMINI_API_KEY environment variable in Vercel project settings
3. Deploy automatically on every push to main branch

### Manual Deployment

`ash
npm run build
# Deploy the 'dist' folder to your hosting provider
`

## API Integration

The application integrates with Google Gemini API through a service layer. Ensure you have:

1. A valid Gemini API key from [Google AI Studio](https://ai.google.dev)
2. Proper environment variable configuration
3. API rate limits in mind for production use

## Development

### TypeScript

All code is written in TypeScript for maximum type safety:

`ash
npm run lint  # Check TypeScript and ESLint issues
`

### Building Components

Components follow React best practices:
- Functional components with hooks
- Proper prop typing with TypeScript
- Clear separation of concerns

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

This project is open source. See LICENSE file for details.

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Contact

For questions or inquiries about this project, feel free to open an issue on GitHub.

---

**Last Updated**: January 2025  
**Maintained By**: torresjchristopher
