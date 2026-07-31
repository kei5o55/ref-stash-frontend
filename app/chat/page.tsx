"use client";

import { useState, useEffect } from "react";
import { createConsumer } from "@rails/actioncable";
import { Channel, MessageItem } from "../../logic/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// HTTP(S) の URL から WS(S) の WebSocket URL を自動生成
// 例: http://localhost:3000 -> ws://localhost:3000/cable
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws") + "/cable";

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // 送信フォーム用 State
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState<"text" | "image">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    console.log("Current API_BASE_URL:", API_BASE_URL);
  }, []);

  // 1. チャンネル一覧の取得
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/channels`)
      .then((res) => res.json())
      .then((data: Channel[]) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannelId(data[0].id);
      })
      .catch((err) => console.error("Channels fetch error:", err));
  }, []);

  // 2. 選択中チャンネルのメッセージ取得
  useEffect(() => {
    if (!selectedChannelId) return;

    fetch(`${API_BASE_URL}/api/v1/channels/${selectedChannelId}/messages`)
      .then((res) => res.json())
      .then((data: MessageItem[]) => setMessages(data))
      .catch((err) => console.error("Messages fetch error:", err));
  }, [selectedChannelId]);

  // ⚡️ 3. Action Cable（WebSocket）のリアルタイム受信処理
  useEffect(() => {
    if (!selectedChannelId) return;

    // Action Cable の Consumer を生成
    const consumer = createConsumer(WS_BASE_URL);

    // 選択されたチャンネル部屋を購読 (Subscribe)
    const subscription = consumer.subscriptions.create(
      { channel: "MessagesChannel", channel_id: selectedChannelId },
      {
        received(newMessage: MessageItem) {
          // 他端末（または自分）から送信された新着メッセージを即座に State に追加
          setMessages((prev) => {
            // 重複追加の防止（既にリストに同じIDがあれば追加しない）
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        },
      }
    );

    // チャンネル変更時やコンポーネントのアンマウント時に接続を解除
    return () => {
      subscription.unsubscribe();
      consumer.disconnect();
    };
  }, [selectedChannelId]);

  // 4. メッセージ投稿処理 (FormData 形式)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || (!content.trim() && !selectedFile)) return;

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("type", messageType);

    if (messageType === "image" && selectedFile) {
      formData.append("image", selectedFile);
    }

    tags.forEach((tag) => {
      formData.append("tags[]", tag);
    });

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/channels/${selectedChannelId}/messages`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        // ※ サーバー側で MessagesChannel.broadcast_to を実行している場合、
        // WebSocket 経由で received() が発火するため、ここでは State 追加を行わなくても自動更新されます。
        // （重複防止ロジックが入っているため、ここで追加しても問題ありません）
        const newMessage: MessageItem = await res.json();
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        // フォームのリセット
        setContent("");
        setSelectedFile(null);
        setTagInput("");
        setMessageType("text");
      } else {
        console.error("Failed to post message");
      }
    } catch (err) {
      console.error("Post error:", err);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* 左サイドバー：チャンネル一覧 */}
      <div style={{ width: "220px", borderRight: "1px solid #ccc", padding: "16px", backgroundColor: "#f9f9f9" }}>
        <h3>チャンネル</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {channels.map((ch) => (
            <li
              key={ch.id}
              onClick={() => setSelectedChannelId(ch.id)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderRadius: "4px",
                backgroundColor: selectedChannelId === ch.id ? "#e0e0e0" : "transparent",
                fontWeight: selectedChannelId === ch.id ? "bold" : "normal",
              }}
            >
              # {ch.name}
            </li>
          ))}
        </ul>
      </div>

      {/* 右メインエリア：メッセージ履歴 ＆ 投稿フォーム */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* メッセージ一覧 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: "16px",
                padding: "12px",
                border: "1px solid #eee",
                borderRadius: "8px",
                backgroundColor: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{msg.time}</span>
                {msg.isEdited && <span style={{ fontSize: "0.75rem", color: "#aaa" }}>(編集済み)</span>}
              </div>

              {/* 本文表示 */}
              <p style={{ margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}>{msg.content}</p>

              {/* Active Storage から返却された画像 URL (msg.url) を表示 */}
              {msg.type === "image" && msg.url && (
                <div style={{ marginTop: "8px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={msg.url}
                    alt="投稿画像"
                    style={{ maxWidth: "300px", maxHeight: "200px", borderRadius: "6px", objectFit: "cover" }}
                  />
                </div>
              )}

              {/* タグ表示 */}
              {msg.tags && msg.tags.length > 0 && (
                <div style={{ marginTop: "8px", display: "flex", gap: "4px" }}>
                  {msg.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: "#eef2ff",
                        color: "#4f46e5",
                        fontSize: "0.75rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 新規投稿フォーム */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: "16px",
            borderTop: "1px solid #ccc",
            backgroundColor: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem" }}>
              タイプ:
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as "text" | "image")}
                style={{ marginLeft: "4px", padding: "4px" }}
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </label>

            <input
              type="text"
              placeholder="タグ (カンマ区切り例: 重要, メモ)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              style={{ flex: 1, padding: "6px", fontSize: "0.85rem" }}
            />
          </div>

          {/* タイプが Image の場合はファイル選択用の input を表示 */}
          {messageType === "image" && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ padding: "4px", fontSize: "0.85rem" }}
            />
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <textarea
              placeholder="メッセージを入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              style={{ flex: 1, padding: "8px", resize: "none" }}
            />
            <button
              type="submit"
              style={{
                padding: "0 16px",
                backgroundColor: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}