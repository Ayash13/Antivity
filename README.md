# Antjvity — Walk with Purpose

<div align="center">
  <img src="public/logo/antjvity-logo.webp" alt="Antjvity Logo" width="300" />
  
  **Antjvity gives more purpose to your walk. Discover things, notice your surroundings, and make every step more meaningful.**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14.2.25-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-green?style=flat-square)](https://web.dev/progressive-web-apps/)
</div>

## 🌟 Overview

Antjvity is a gamified walking companion that transforms ordinary walks into purposeful adventures. Users receive randomized search missions (find a cat, spot a pink car, discover a unique tree) that encourage mindful observation of their surroundings. The app combines fitness tracking, journaling, and social sharing to create a comprehensive walking experience.

## ✨ Features

### 🎯 **Mission-Based Walking**

- Randomized daily missions with specific objects to find
- GPS-based distance measurement

### 📖 **Digital Journal**

- Photo-based journal entries with stories
- Calendar view for browsing past adventures
- Distance and time tracking for each session
- Text editing for detailed storytelling

### 👥 **Social Features**

- Share walking achievements and photos
- Like and comment on community posts
- User profiles with bio and avatar customization
- Favorites system for memorable content

### 🔐 **Authentication & Profiles**

- Firebase Authentication with email/password
- Customizable user profiles with avatars
- Secure data storage in Firestore
- Privacy-focused design with user data control

## 🛠 Technology Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI for accessibility
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React + Custom SVG icons
- **Charts**: Recharts for data visualization
- **PWA**: Custom service worker and manifest

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase project with Authentication, Firestore, and Storage enabled
- Modern web browser with PWA support

### Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env

# Firebase Configuration

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
\`\`\`

### Firebase Setup

1. **Create a Firebase Project**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing one
   - Enable Authentication, Firestore, and Storage

2. **Configure Authentication**

   - Enable Email/Password authentication
   - Set up authorized domains for your deployment

3. **Set up Firestore Database**

   - Create database in production mode
   - Configure security rules for user data access

4. **Configure Storage**
   - Set up Firebase Storage for user uploads
   - Configure CORS for web access

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/antjvity.git
   cd antjvity
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install

   # or

   yarn install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env.local

   # Edit .env.local with your Firebase configuration

   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev

   # or

   yarn dev
   \`\`\`

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 PWA Installation

### Mobile Devices

1. Open the app in your mobile browser
2. Look for "Add to Home Screen" prompt
3. Follow browser-specific installation steps
4. Launch from home screen for full app experience

### Desktop

1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Confirm installation
4. Access from desktop or start menu

## 🎮 Usage Guide

### Getting Started

1. **Create Account**: Sign up with email and password
2. **Complete Onboarding**: Learn about app features
3. **Grant Permissions**: Allow location and camera access
4. **Start First Mission**: Receive your first walking challenge

### Daily Workflow

1. **Check Mission**: View today's search targets
2. **Start Walking**: Begin GPS tracking
3. **Find Objects**: Search for mission items during walk
4. **Capture Photos**: Document discoveries
5. **Complete Journal**: Add stories and reflections
6. **Share Experience**: Post to community feed

### Advanced Features

- **Profile Customization**: Upload avatar and write bio
- **Social Interaction**: Like, comment, and share posts
- **Progress Tracking**: View walking statistics and achievements
- **Offline Mode**: Continue using core features without internet

## 🔧 Development

### Available Scripts

\`\`\`bash
npm run dev # Start development server
npm run build # Build for production
npm run start # Start production server
npm run lint # Run ESLint
\`\`\`

### Code Style

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Tailwind CSS for styling
- Component-based architecture

### Testing

- Manual testing on multiple devices
- PWA functionality verification
- Firebase integration testing

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

- Netlify: Configure build settings and environment variables
- Firebase Hosting: Use Firebase CLI for deployment
- Custom Server: Build and serve static files

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

- Follow existing code style and patterns
- Add TypeScript types for new features
- Test on mobile devices before submitting
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

\`\`\`
MIT License

Copyright (c) 2025 Antjvity

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
\`\`\`

## 🙏 Acknowledgments

- **Firebase** for backend infrastructure
- **Vercel** for hosting and deployment
- **Radix UI** for accessible components
- **Tailwind CSS** for styling system
- **Lucide** for beautiful icons

## 📞 Support

- **Email**: m.ayashal.f@gmail.com

---

<div align="center">
  <p>Made with ❤️ for mindful walkers everywhere</p>
  <p><strong>Start your purposeful walking journey today!</strong></p>
</div>
