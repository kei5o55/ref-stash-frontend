"use client";

import { useState, useRef } from "react";
import ChannnelBar from "../components/channnelbar";
import MessageArea from "../components/messagearea";
import PictureBar from "../components/picturebar";
import { Channel, MessageItem } from "../logic/types";

  // 🔴 page.tsx の上部または別ファイルでダミーデータを多めに生成（例: 120件）
const ALL_MOCK_ITEMS: MessageItem[] = Array.from({ length: 120 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    channelId: 2, // 開発中のデフォルトチャンネルID
    type: id % 10 === 0 ? "image" : "text",
    content: id % 10 === 0 
      ? `ダミー画像メッセージ #${id}` 
      : `これはダミーメッセージ #${id} です。テスト用に長めのテキストを入れています。`,
    url: id % 10 === 0 ? "https://picsum.photos/400/300" : undefined,
    time: "12:00",
    tags: id % 5 === 0 ? ["テスト", "重要"] : undefined,
  };
});
const LIMIT = 50; // 1回に読み込む件数

export default function Home() {
  
  
  const [channels, setChannels] = useState<Channel[]>([
    { id: 1, name: "全般・画像保存" },
    { id: 2, name: "テキストメモ" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannelId, setActiveChannelId] = useState<number>(1);
  const [isImageSidebarOpen, setIsImageSidebarOpen] = useState(false);
  /*const [items, setItems] = useState<MessageItem[]>([
    { id: 1, channelId: 1, type: "text", content: "7月のバイト代でラズパイ5買うぞ！💪", time: "12:34" },
    { id: 2, channelId: 1, type: "image", content: "聖女様のイラスト", url: "https://chunithm.sega.jp/storage/chara/chunithm-sun/illustration/s_others_4.webp?_=20260701.190431", time: "13:00" },
    {id:4,channelId: 1,type:"image",content:"ノワさんのイラスト",url:"https://chunithm.sega.jp/storage/chara/chunithm-mate/illustration/m_3.webp",time:"11:88",tags:["illust"]},
    { id: 3, channelId: 2, type: "text", content: "ここにRailsのAPI設計メモを書く予定", time: "15:00" },
  ]);*/
  const [inputText, setInputText] = useState("");
  // 🔴 全データ（ALL_MOCK_ITEMS）から最新50件を切り出して初期Stateにする
  const [items, setItems] = useState<MessageItem[]>([
    ...ALL_MOCK_ITEMS.slice(-LIMIT),

    {
      id: 151,
      channelId: 1,
      type: "text",
      content: "7月のバイト代でラズパイ5買うぞ！💪",
      time: "12:34",
    },
    {
      id: 152,
      channelId: 1,
      type: "image",
      content: "聖女様のイラスト",
      url: "https://chunithm.sega.jp/storage/chara/chunithm-sun/illustration/s_others_4.webp?_=20260701.190431",
      time: "13:00",
    },
    {
      id: 154,
      channelId: 1,
      type: "image",
      content: "ノワさんのイラスト",
      url: "https://chunithm.sega.jp/storage/chara/chunithm-mate/illustration/m_3.webp",
      time: "11:88",
      tags: ["illust"],
    },
    {
      id: 153,
      channelId: 2,
      type: "text",
      content: "ここにRailsのAPI設計メモを書く予定",
      time: "15:00",
    },
  ]);

  // 🔴 まだ読み込めていない過去ログが存在するか判定
  const oldestId = items.length > 0 ? items[0].id : 1;
  const hasMore = ALL_MOCK_ITEMS.some((m) => m.id < oldestId);

  // 🔴 過去ログを読み込むモック関数
  const handleLoadMore = () => {
    if (!hasMore) return;

    // 現在表示している一番古いID（oldestId）より小さいメッセージをさらに過去50件取得
    const olderMessages = ALL_MOCK_ITEMS
      .filter((m) => m.id < oldestId)
      .slice(-LIMIT);

    // 配列の先頭に過去ログをガッチャンコ！
    setItems((prev) => [...olderMessages, ...prev]);
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachedTags, setAttachedTags] = useState<string[]>([]);//tagに関するstate
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  

  // タグを追加する関数
  const handleAddTag = (tag: string) => {
    const formattedTag = tag.trim().replace(/^#/, ""); // 先頭の # を除去して統一
    if (formattedTag && !attachedTags.includes(formattedTag)) {
      setAttachedTags((prev) => [...prev, formattedTag]);
    }
  };

  // タグを削除する関数
  const handleRemoveTag = (tagToRemove: string) => {
    setAttachedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };
  

  // チャンネル作成のモック
  const handleCreateChannel = () => {
    const name = prompt("新しいチャンネル名を入力してください");
    if (!name?.trim()) return;
    setChannels([...channels, { id: Date.now(), name: name.trim() }]);
  };

  // メッセージ削除処理
  const handleDeleteMessage = (id: number) => {
    if (confirm("メッセージを削除しますか？")) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  // ドロップ時のハンドラ
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // 1枚目の画像ファイルをチェックして添付処理へ
    const file = files[0];
    if (file.type.startsWith("image/")) {
      uploadImageFile(file);
    }
  };

  // テキストメッセージ送信
  // 🔴 handleSend を修正（tagsをセットし、送信後にリセット）
  const handleSend = () => {
    if (!inputText.trim() && !attachedImage) return;

    const newTags = attachedTags.length > 0 ? attachedTags : undefined;

    if (attachedImage) {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          channelId: activeChannelId,
          type: "image",
          content: inputText.trim() || attachedImage.name,
          url: attachedImage.url,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tags: newTags, // 👈 タグを追加
        },
      ]);
    } else if (inputText.trim()) {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          channelId: activeChannelId,
          type: "text",
          content: inputText.trim(),
          url: "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tags: newTags, // 👈 タグを追加
        },
      ]);
    }

    // リセット
    setInputText("");
    setAttachedImage(null);
    setAttachedTags([]); // 👈 送信後にタグ領域をクリア
  };

  // 画像ファイル追加（FileReaderを使ったモック）
  // 🔴 画像ファイルを「送信」せず「一時保存」するように修正
  const uploadImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      // 即時 setItems せず、添付Stateに保持する
      setAttachedImage({
        url: base64Url,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // 1. ファイル選択（input type="file"）時のハンドラ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadImageFile(files[0]);
    e.target.value = ""; // 同じファイルを連続で選択できるようにリセット
  };

  // 2. コピペ（Paste）時のハンドラ
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      // 貼り付けられたデータが「画像」かどうかをチェック
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // デフォルトの貼り付け動作（テキストとしてのペーストなど）を防止
          e.preventDefault();
          uploadImageFile(file);
          break; // 1枚見つかったら処理を抜ける
        }
      }
    }
  };

  const currentChannel = channels.find((c) => c.id === activeChannelId);
  // 1. まず現在のチャンネルで絞り込む
  const filteredItems = items.filter((item) => item.channelId === activeChannelId);

  // 2. さらに検索キーワードに一致するものだけを絞り込む（displayedItemsとする）
  const displayedItems = filteredItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().replace(/^#/, ""); // #が付いていても検索できるように

    // 1. 本文にマッチするか
    const matchesContent = item.content.toLowerCase().includes(q);
    // 2. タグのいずれかにマッチするか
    const matchesTag = item.tags?.some((t) => t.toLowerCase().includes(q));

    return matchesContent || matchesTag;
  });

  // スクロール参照用のrefとスクロール関数
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollToMessage = (id: number) => {
    messageRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };


  return (
    <div className="flex h-screen bg-[#313338] text-[#dbdee1] font-sans antialiased overflow-hidden relative">
      {/* 1. 左側：チャンネルバー */}
      <ChannnelBar
        channels={channels}
        activeChannelId={activeChannelId}
        setActiveChannelId={setActiveChannelId}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        onCreateChannel={handleCreateChannel}
      />

      {/* 2. 中央：メインメッセージ画面 */}
      <MessageArea
        currentChannel={currentChannel}
        filteredItems={displayedItems} // 👈 ここを displayedItems に変更！
        searchQuery={searchQuery}       // 👈 追加
        setSearchQuery={setSearchQuery} // 👈 追加
        attachedImage={attachedImage}
        onRemoveAttachedImage={() => setAttachedImage(null)}
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
        hasMore={hasMore}             // 👈 過去ログがあるか
        onLoadMore={handleLoadMore}   // 👈 読み込み関数
      />

      {/* 3. 右側：画像一覧バー */}
      <PictureBar
        filteredItems={filteredItems}
        isImageSidebarOpen={isImageSidebarOpen}
        setIsImageSidebarOpen={setIsImageSidebarOpen}
        onScrollToMessage={scrollToMessage}
      />
    </div>
  );
}