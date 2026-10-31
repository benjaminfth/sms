import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Shell } from "@/components/layout/Shell";

export const metadata = {
  title: "Brightloop — Subscription Management System",
  description: "B2B Subscription Management, Commercial Lifecycle & Recurring Billing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}

