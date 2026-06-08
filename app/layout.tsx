export const metadata = {
  title: "Jack Script",
  description: "Stage-gated video production pipeline — brief, script, audio, storyboard, and animatic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
