import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Download, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { downloadTicketPdf } from "@/lib/generateTicket";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-assistant-chat`;
const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

type BookingResult = {
  found: boolean;
  name?: string;
  ticket_code?: string;
  secure_ticket_token?: string;
  package_type?: string;
  payment_status?: string;
  ticket_issued?: boolean;
  total_cost?: number;
  total_paid?: number;
  error?: string;
};

const BookingCard = ({ data }: { data: BookingResult }) => {
  const [busy, setBusy] = useState(false);
  if (!data?.found) {
    return (
      <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
        No booking matches that email and phone. Please double-check both and try again.
      </div>
    );
  }
  const onDownload = async () => {
    if (!data.ticket_code || !data.secure_ticket_token) return;
    try {
      setBusy(true);
      await downloadTicketPdf({
        name: data.name || "Guest",
        bookingCode: data.ticket_code,
        ticketType: data.package_type || "Ticket",
        amount: Number(data.total_paid || 0),
        status: data.payment_status || "pending",
        secureToken: data.secure_ticket_token,
      });
      toast.success("Ticket downloaded");
    } catch (e: any) {
      toast.error("Could not generate ticket: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-sm">
      <p className="text-xs uppercase tracking-wider text-primary/80">Booking Code</p>
      <p className="font-mono text-2xl font-extrabold tracking-widest text-primary">{data.ticket_code}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Name</span><span className="text-foreground">{data.name}</span>
        <span>Package</span><span className="text-foreground capitalize">{data.package_type}</span>
        <span>Status</span><span className="text-foreground capitalize">{data.payment_status}</span>
        <span>Paid</span><span className="text-foreground">KES {Number(data.total_paid).toLocaleString()} / {Number(data.total_cost).toLocaleString()}</span>
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {busy ? "Preparing…" : "Download my ticket"}
      </button>
      {data.payment_status !== "paid" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Your ticket will display the current payment status. Once fully paid it becomes valid for entry.
        </p>
      )}
    </div>
  );
};

const initialMessage: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "Hi! I can help you retrieve your booking code and ticket. Please share the **email** and **phone number** you used when registering.",
    },
  ],
};

const BookingAssistant = () => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: "booking-assistant",
    messages: [initialMessage],
    transport: new DefaultChatTransport({
      api: CHAT_URL,
      headers: { Authorization: AUTH_HEADER },
    }),
    onError: (e) => toast.error(e.message || "Chat error"),
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, status]);

  const handleSubmit = (msg: PromptInputMessage) => {
    const text = msg.text?.trim();
    if (!text) return;
    sendMessage({ text });
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open booking assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/20 transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[85vh] flex-col rounded-2xl border border-border bg-background shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Booking Assistant</p>
                <p className="text-[11px] text-muted-foreground">Retrieve your code &amp; ticket</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <Conversation className="flex-1 overflow-hidden">
            <ConversationContent className="px-3 py-3">
              {messages.length === 0 && (
                <ConversationEmptyState title="Ask me anything" description="I can look up your booking code." />
              )}
              {messages.map((m) => {
                const textParts = m.parts.filter((p) => p.type === "text") as Array<{ type: "text"; text: string }>;
                const toolBookingParts = m.parts.filter(
                  (p: any) => p.type === "tool-lookup_booking" || p.type === "tool-result",
                );
                const isUser = m.role === "user";
                return (
                  <Message key={m.id} from={m.role as "user" | "assistant"}>
                    <MessageContent
                      className={isUser ? "bg-primary text-primary-foreground" : "bg-transparent p-0"}
                    >
                      {textParts.map((p, i) =>
                        isUser ? (
                          <p key={i} className="whitespace-pre-wrap text-sm">{p.text}</p>
                        ) : (
                          <MessageResponse key={i}>{p.text}</MessageResponse>
                        ),
                      )}
                      {toolBookingParts.map((p: any, i) => {
                        const output = (p.output ?? p.result) as BookingResult | undefined;
                        if (!output) {
                          return (
                            <div key={i} className="mt-2 text-xs text-muted-foreground">
                              <Shimmer>Looking up your booking…</Shimmer>
                            </div>
                          );
                        }
                        return <BookingCard key={i} data={output} />;
                      })}
                    </MessageContent>
                  </Message>
                );
              })}
              {isLoading && (
                <div className="px-2 py-1 text-xs">
                  <Shimmer>Thinking…</Shimmer>
                </div>
              )}
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {error.message}
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t border-border p-2">
            <PromptInput onSubmit={handleSubmit} className="rounded-xl">
              <PromptInputTextarea
                ref={inputRef}
                placeholder="Type your email and phone…"
                autoFocus
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} disabled={isLoading} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingAssistant;