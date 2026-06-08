export const metadata = {
  title: "Jack Script",
  description: "Professional screenwriting workstation — local-first AI co-pilot for storytellers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
