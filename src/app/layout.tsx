import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#18181B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "GetChef - Chefs Privados de Élite",
  description: "Reserva chefs privados de élite para tu próxima experiencia gastronómica",
  applicationName: "GetChef",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GetChef",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "GetChef",
    title: "GetChef - Chefs Privados de Élite",
    description: "Reserva chefs privados de élite para tu próxima experiencia gastronómica",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        {/* Captura beforeinstallprompt antes de que React monte */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;});`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <AuthHashHandler />
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
        <PushNotificationPrompt />
      </body>
    </html>
  );
}
