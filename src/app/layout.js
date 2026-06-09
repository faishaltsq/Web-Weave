import './globals.css';

export const metadata = {
  title: 'WebWeave - AI Web Automation Code Generator',
  description: 'Generate production-ready web automation scripts for Playwright, Puppeteer, Selenium, and Cypress instantly from a URL and natural language prompts.',
  icons: {
    icon: '/logo?v=round',
    shortcut: '/logo?v=round',
    apple: '/logo?v=round',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
