import "~/styles/globals.css";
import { TRPCReactProvider } from "~/lib/trpc/react";

export const metadata = {
  title: "Thomas Writing Assistant",
  description: "AI-powered writing assistant with Zettelkasten knowledge base",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

