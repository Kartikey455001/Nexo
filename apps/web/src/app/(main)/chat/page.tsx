import { MessageSquareDashed } from "lucide-react";

export default function ChatEmptyState() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-secondary/30 flex items-center justify-center mb-6 ring-1 ring-white/5">
        <MessageSquareDashed className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">NEXO Web</h2>
      <p className="text-muted-foreground max-w-sm">
        Select a chat from the sidebar or start a new conversation. Your messages are end-to-end encrypted.
      </p>
    </div>
  );
}
