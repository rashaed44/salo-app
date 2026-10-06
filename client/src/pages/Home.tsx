export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0a0e27]">
      <iframe
        title="دردشتي"
        src="/dardshti/index.html"
        className="h-full w-full border-0"
        allow="camera; microphone; fullscreen"
      />
    </main>
  );
}
