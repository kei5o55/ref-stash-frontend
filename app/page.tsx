"use client";

import { useState, useEffect, useRef } from "react";
import { createConsumer, Consumer } from "@rails/actioncable";
import ChannnelBar from "../components/channnelbar";
import MessageArea from "../components/messagearea";
import PictureBar from "../components/picturebar";
import WarnConfirm from "@/components/WarnConfrim";
import { Channel, MessageItem } from "../logic/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// 動的に WebSocket の URL を取得する関数
const getWsUrl = () => {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = "3000";
    return `${protocol}//${host}:${port}/cable`;
  }
  return API_BASE_URL.replace(/^http/, "ws") + "/cable";
};

// ⚡️ WebSocket コネクション（Consumer）をコンポーネント外で1つだけ保持する
let consumer: Consumer | null = null;
const getConsumer = () => {
  if (!consumer && typeof window !== "undefined") {
    consumer = createConsumer(getWsUrl());
  }
  return consumer;
};

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [isImageSidebarOpen, setIsImageSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [items, setItems] = useState<MessageItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "message" | "channel";
    id: number;
  } | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachedTags, setAttachedTags] = useState<string[]>([]);
  // 画像添付用 (Fileオブジェクト保持)
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  // 画像プレビュー表示用
  const [attachedImagePreview, setAttachedImagePreview] = useState<{ url: string; name: string } | null>(null);

  // 1. バックエンドからチャンネル一覧を取得
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/channels`)
      .then((res) => res.json())
      .then((data: Channel[]) => {
        setChannels(data);
        if (data.length > 0) setActiveChannelId(data[0].id);
      })
      .catch((err) => console.error("Channels fetch error:", err));
  }, []);

  // 2. 選択中チャンネルのメッセージ取得 & Action Cable リアルタイム受信
  useEffect(() => {
    if (!activeChannelId) return;

    // メッセージの初期取得
    fetch(`${API_BASE_URL}/api/v1/channels/${activeChannelId}/messages`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        } else if (data && Array.isArray(data.messages)) {
          setItems(data.messages);
        } else {
          console.error("Received non-array data:", data);
          setItems([]);
        }
      })
      .catch((err) => {
        console.error("Messages fetch error:", err);
        setItems([]);
      });

    // ⚡️ シングルトンの Consumer を取得して Subscription（購読）のみ登録
    const currentConsumer = getConsumer();
    if (!currentConsumer) return;

    const subscription = currentConsumer.subscriptions.create(
      { channel: "MessagesChannel", channel_id: activeChannelId },
      {
        received(newMessage: MessageItem) {
          setItems((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            // すでに存在していれば更新しない
            if (current.some((item) => item.id === newMessage.id)) {
              return current;
            }
            return [...current, newMessage];
          });
        },
      }
    );

    // クリーンアップ処理（Subscriptionの解除のみ行う）
    return () => {
      subscription.unsubscribe();
    }; 

  }, [activeChannelId]);

  // タグ追加・削除
  const handleAddTag = (tag: string) => {
    const formattedTag = tag.trim().replace(/^#/, "");
    if (formattedTag && !attachedTags.includes(formattedTag)) {
      setAttachedTags((prev) => [...prev, formattedTag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setAttachedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // 画像選択時のアタッチ処理 (Fileを直接保持する)
  const uploadImageFile = (file: File) => {
    setAttachedImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImagePreview({
        url: event.target?.result as string,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadImageFile(files[0]);
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteItems = e.clipboardData.items;
    for (let i = 0; i < pasteItems.length; i++) {
      if (pasteItems[i].type.indexOf("image") !== -1) {
        const file = pasteItems[i].getAsFile();
        if (file) {
          e.preventDefault();
          uploadImageFile(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith("image/")) {
      uploadImageFile(files[0]);
    }
  };

  // 3. バックエンドへの送信処理 (FormData 使用)
  const handleSend = async () => {
    if (!inputText.trim() && !attachedImageFile) return;

    const formData = new FormData();
    formData.append("content", inputText.trim());
    formData.append("type", attachedImageFile ? "image" : "text");

    if (attachedImageFile) {
      formData.append("image", attachedImageFile);
    }

    attachedTags.forEach((tag) => {
      formData.append("tags[]", tag);
    });

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/channels/${activeChannelId}/messages`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        setInputText("");
        setAttachedImageFile(null);
        setAttachedImagePreview(null);
        setAttachedTags([]);
      } else {
        const errorData = await res.json();
        console.error("送信エラーの詳細:", errorData);
      }
    } catch (err) {
      console.error("Post error:", err);
    }
  };

  const handleEditMessage = (id: number, newContent: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, content: newContent, isEdited: true } : item
      )
    );
  };

  const handleDeleteMessage = (id: number) => {
    setDeleteTarget({
      type: "message",
      id,
    });
  };

  const handleDeleteChannel = (id: number) => {
    setDeleteTarget({
      type: "channel",
      id,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "message") {
      setItems((prev) =>
        prev.filter((item) => item.id !== deleteTarget.id)
      );
    }

    if (deleteTarget.type === "channel") {
      setChannels((prev) =>
        prev.filter((channel) => channel.id !== deleteTarget.id)
      );
    }

    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleCreateChannel = async () => {
    const name = prompt("新しいチャンネル名を入力してください");
    if (!name?.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const newChannel: Channel = await res.json();
        setChannels((prev) => [...prev, newChannel]);
        setActiveChannelId(newChannel.id);
      }
    } catch (err) {
      console.error("Channel create error:", err);
    }
  };

  const currentChannel = channels.find((c) => c.id === activeChannelId);
  const safeItems = Array.isArray(items) ? items : [];
  const filteredItems = safeItems.filter((item) => item.channelId === activeChannelId);

  const displayedItems = filteredItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().replace(/^#/, "");
    const matchesContent = item.content.toLowerCase().includes(q);
    const matchesTag = item.tags?.some((t) => t.toLowerCase().includes(q));
    return matchesContent || matchesTag;
  });

  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollToMessage = (id: number) => {
    messageRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="flex h-screen bg-[#313338] text-[#dbdee1] font-sans antialiased overflow-hidden relative">
      <ChannnelBar
        channels={channels}
        activeChannelId={activeChannelId}
        setActiveChannelId={setActiveChannelId}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        onCreateChannel={handleCreateChannel}
      />

      <MessageArea
        currentChannel={currentChannel}
        filteredItems={displayedItems}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        attachedImage={attachedImagePreview}
        onRemoveAttachedImage={() => {
          setAttachedImageFile(null);
          setAttachedImagePreview(null);
        }}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isImageSidebarOpen={isImageSidebarOpen}
        setIsImageSidebarOpen={setIsImageSidebarOpen}
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        onFileChange={handleFileChange}
        onPaste={handlePaste}
        onDeleteMessage={handleDeleteMessage}
        messageRefs={messageRefs}
        onDrop={handleDrop}
        attachedTags={attachedTags}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        hasMore={false}
        onLoadMore={() => {}}
        onEditMessage={handleEditMessage}
      />

      <PictureBar
        filteredItems={filteredItems}
        isImageSidebarOpen={isImageSidebarOpen}
        setIsImageSidebarOpen={setIsImageSidebarOpen}
        onScrollToMessage={scrollToMessage}
      />

      <WarnConfirm
        isOpen={deleteTarget !== null}
        title={
          deleteTarget?.type === "channel"
            ? "チャンネルを削除"
            : "メッセージを削除"
        }
        message={
          deleteTarget?.type === "channel"
            ? "このチャンネルを削除しますか？\nこの操作は取り消せません。"
            : "このメッセージを削除しますか？\nこの操作は取り消せません。"
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}