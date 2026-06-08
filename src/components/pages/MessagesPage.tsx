"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/providers/app-providers";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useTrustActionRedirect } from "@/hooks/useTrustActionRedirect";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Send,
  BookOpen,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

export default function Messages() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handleTrustError = useTrustActionRedirect();

  const { data: conversations, isLoading: convLoading } = trpc.message.conversations.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 5000 }
  );

  const { data: messages, isLoading: msgLoading } = trpc.message.byConversation.useQuery(
    { conversationId: selectedConversation! },
    { enabled: selectedConversation !== null, refetchInterval: 3000 }
  );

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setMessageInput("");
      utils.message.byConversation.invalidate({ conversationId: selectedConversation! });
    },
    onError: handleTrustError,
  });

  const utils = trpc.useUtils();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <MessageCircle className="w-16 h-16 text-[#999] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#111] mb-2">Sign in to view messages</h2>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 bg-[#007782] text-white font-semibold rounded-md hover:bg-[#005f66] transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessage.mutate({
      conversationId: selectedConversation,
      content: messageInput.trim(),
    });
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1000px] mx-auto px-4 py-4">
        <div className="border border-[#E0E0E0] rounded-xl overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
          <div className="flex h-full">
            {/* Conversations List */}
            <div
              className={`w-full md:w-80 border-r border-[#E0E0E0] bg-white flex flex-col ${
                selectedConversation !== null ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="p-4 border-b border-[#E0E0E0]">
                <h2 className="text-lg font-semibold text-[#111]">Messages</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {convLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-10 h-10 bg-[#EEEEEE] rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-[#EEEEEE] rounded w-2/3" />
                          <div className="h-3 bg-[#EEEEEE] rounded w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations && conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-[#F7F7F7] transition-colors border-b border-[#F7F7F7] ${
                        selectedConversation === conv.id ? "bg-[#F7F7F7]" : ""
                      }`}
                    >
                      <img
                        src={
                          conv.otherUserAvatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.otherUserName || "user"}`
                        }
                        alt={conv.otherUserName || "User"}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#111] truncate">
                            {conv.otherUserName || "User"}
                          </p>
                        </div>
                        {conv.bookTitle && (
                          <p className="text-xs text-[#007782] truncate flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {conv.bookTitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-[#999] mb-3" />
                    <p className="text-sm text-[#666]">No conversations yet</p>
                    <p className="text-xs text-[#999] mt-1">
                      Start messaging from a book listing
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div
              className={`flex-1 flex flex-col bg-white ${
                selectedConversation === null ? "hidden md:flex" : "flex"
              }`}
            >
              {selectedConversation !== null && selectedConv ? (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-[#E0E0E0]">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-1 text-[#666] hover:text-[#111]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <img
                      src={
                        selectedConv.otherUserAvatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv.otherUserName || "user"}`
                      }
                      alt={selectedConv.otherUserName || "User"}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#111]">
                        {selectedConv.otherUserName || "User"}
                      </p>
                      {selectedConv.bookTitle && (
                        <p className="text-xs text-[#007782] flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {selectedConv.bookTitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 border-b border-[#FFE0B2] bg-[#FFF8E1] px-4 py-2 text-xs leading-5 text-[#8D4E00]">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Payments arranged in chat are unprotected. BookSwap does not provide escrow,
                    refunds, buyer protection, or delivery guarantees.
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {msgLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`animate-pulse flex ${
                              i % 2 === 0 ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`h-8 bg-[#EEEEEE] rounded-lg ${
                                i % 2 === 0 ? "w-32" : "w-48"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : messages && messages.length > 0 ? (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                                isMe
                                  ? "bg-[#007782] text-white rounded-br-sm"
                                  : "bg-[#F7F7F7] text-[#111] rounded-bl-sm"
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  isMe ? "text-white/60" : "text-[#999]"
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-sm text-[#999]">
                          No messages yet. Say hello!
                        </p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={handleSend}
                    className="p-4 border-t border-[#E0E0E0] flex gap-2"
                  >
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 bg-[#F7F7F7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#007782]/20 focus:bg-white border border-transparent focus:border-[#007782]"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sendMessage.isPending}
                      className="w-10 h-10 flex items-center justify-center bg-[#007782] text-white rounded-full hover:bg-[#005f66] transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageCircle className="w-16 h-16 text-[#E0E0E0] mb-4" />
                  <p className="text-[#666]">Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
