export const metadata = {
  title: "League'd Up",
  description: "One scoreboard for all your fantasy football leagues.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#0A0A0B" }}>{children}</body>
    </html>
  );
}
