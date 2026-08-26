import { ChatBubbleIcon } from "@/components/icons";

export default function ChatPage() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--g-green-mint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <ChatBubbleIcon color="var(--g-green-text)" />
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>
        Chat is coming soon
      </h1>
      <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", maxWidth: 340, margin: 0 }}>
        Soon you&apos;ll describe who you&apos;re looking for and Mantis will decide which sources to pull from.
      </p>
    </div>
  );
}
