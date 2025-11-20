# Tutoring Management System

Next.js frontend for the Tutoring Management System - a comprehensive platform for managing student assignments, wrong answers, and spaced repetition learning.

## Features

- 📚 Problem bank management with visual interface
- 👨‍🎓 Student profiles and progress tracking
- 📅 Daily assignment generation (review + new problems)
- ✅ Multiple grading modes:
  - Checkbox selection for visual grading
  - Text input for bulk grading from student messages
- 🔄 Spaced repetition tracking with automatic scheduling
- 📊 Progress statistics and attempt history
- 📝 Bulk problem registration (quick mode & code mode)
- 🗂️ Ungraded problem management with bulk rescheduling
- 📄 Worksheet PDF generation

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Backend API**: FastAPI (separate repository)

## Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Backend API running

### Installation

1. Install dependencies:
```bash
pnpm install
# or
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, set this to your deployed backend API URL.

### Running the Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
pnpm build
pnpm start
# or
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── students/          # Student management pages
│   │   ├── page.tsx       # Student list
│   │   └── [id]/page.tsx  # Student detail & assignment
│   ├── problems/          # Problem bank pages
│   │   ├── page.tsx       # Problem list
│   │   └── upload/page.tsx # Problem upload
│   └── layout.tsx         # Root layout
├── lib/
│   └── api.ts             # API client functions
├── types/
│   └── index.ts           # TypeScript types
└── styles/
    └── globals.css        # Global styles
```

## Key Features Explained

### Daily Assignment Workflow

1. **Today's Assignment** section shows:
   - Review problems due today (from wrong answer tracker)
   - Additional new problems added for practice

2. **Two Grading Modes**:
   - **Checkbox Mode**: Visual selection and grading
   - **Text Mode**: Paste student's message like:
     ```
     오답 23빡사 1회 3 5 8 15
     보류 23빡사 1회 20 22
     ```

### Problem Code System

Problems use a structured code format for easy reference:
```
{year}_{textbook}[_{chapter}][_{subchapter}]_{number}

Examples:
- 26_23빡사_1회_3
- 26_펀더멘탈_수1_2_13
- 25_수특_3_15
```

### Bulk Registration

Two modes for registering multiple wrong answers:
1. **Quick Mode**: Fill in textbook info, paste problem numbers
2. **Code Mode**: Paste complete problem codes

### Ungraded Problem Management

- View all problems that haven't been graded yet
- Select multiple problems
- Bulk reschedule to a specific date
- Useful for "resetting" when assignments pile up

## Deployment

### Recommended Platforms

- **Vercel**: Optimized for Next.js (recommended)
- **Netlify**: Good Next.js support
- **Railway**: Simple deployment
- **AWS Amplify**: Full-stack hosting

### Environment Variables for Production

Set in your deployment platform:
```
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Vercel Deployment

1. Push code to GitHub
2. Import project to Vercel
3. Set environment variables
4. Deploy

```bash
# Or use Vercel CLI
pnpm install -g vercel
vercel
```

## API Configuration

The frontend expects the backend API to be available at the URL specified in `NEXT_PUBLIC_API_URL`.

Ensure CORS is properly configured on the backend to allow requests from your frontend domain.

## Development Tips

- Use `pnpm dev` for hot reloading during development
- Check browser console for API errors
- API responses are typed - use TypeScript for better DX
- Modify `src/lib/api.ts` to add new API endpoints

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private - All rights reserved
