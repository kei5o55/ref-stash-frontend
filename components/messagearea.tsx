import { MutableRefObject } from "react";
import { Channel, MessageItem } from "../logic/types";
import { useState, useEffect, useLayoutEffect, useRef } from "react";

interface MessageAreaProps {
  currentChannel?: Channel;
  filteredItems: MessageItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  attachedImage: { url: string; name: string } | null;
  onRemoveAttachedImage: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isImageSidebarOpen: boolean;
  setIsImageSidebarOpen: (open: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onDeleteMessage: (id: number) => void;
  messageRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  attachedTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  onEditMessage?: (id: number, newContent: string) => void;
}

// 1. URLを検出して青いハイパーリンクにするコンポーネント
const FormattedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00a8fc] hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

// 2. プレビューカード（OGP/Twitter風）を表示するコンポーネント
const LinkPreviewCard = ({ url }: { url: string }) => {
  const isTwitter = url.includes("twitter.com") || url.includes("x.com");

  const mockOgp = {
    title: isTwitter ? "X (旧Twitter) ユーザーの投稿" : "Webサイトタイトル",
    siteName: isTwitter ? "X (formerly Twitter)" : new URL(url).hostname,
    description: isTwitter
      ? "これはポストの本文プレビューテキストです。リアクションやメディアが含まれる場合があります。"
      : "リンク先のWebページの概要テキストがここに入ります。",
    image: "https://picsum.photos/600/300?random=" + url.length,
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex flex-col max-w-md bg-[#2b2d31] border-l-4 border-[#5865f2] rounded-r-md overflow-hidden hover:bg-[#313338] transition group decoration-0"
    >
      <div className="p-3 text-xs space-y-1">
        <span className="text-[10px] text-[#949ba4] font-semibold uppercase tracking-wider">
          {mockOgp.siteName}
        </span>
        <h4 className="text-sm font-bold text-[#00a8fc] group-hover:underline line-clamp-1">
          {mockOgp.title}
        </h4>
        <p className="text-[#dbdee1] text-xs line-clamp-2 leading-relaxed">
          {mockOgp.description}
        </p>
      </div>
      <div className="w-full h-36 bg-[#1e1f22] overflow-hidden">
        <img
          src={mockOgp.image}
          alt="Preview"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
        />
      </div>
    </a>
  );
};

export default function MessageArea({
  currentChannel,
  filteredItems,
  searchQuery,
  setSearchQuery,
  attachedImage,
  onRemoveAttachedImage,
  setIsMenuOpen,
  isImageSidebarOpen,
  setIsImageSidebarOpen,
  inputText,
  setInputText,
  onSend,
  onFileChange,
  onPaste,
  onDeleteMessage,
  messageRefs,
  onDrop,
  attachedTags,
  onAddTag,
  onRemoveTag,
  hasMore,
  onLoadMore,
  onEditMessage,
}: MessageAreaProps) {
  // 📜 タイムライン表示エリア用の Ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // 📜 画面のスクロール位置補正用 State & Ref
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const previousScrollHeightRef = useRef<number>(0);

  const handleLoadMoreClick = () => {
    if (scrollRef.current) {
      previousScrollHeightRef.current = scrollRef.current.scrollHeight;
    }
    setIsLoadingMore(true);
    onLoadMore();
  };

  useLayoutEffect(() => {
    if (!scrollRef.current) return;

    if (isLoadingMore) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeightRef.current;
      scrollRef.current.scrollTop = heightDifference;
      setIsLoadingMore(false);
    }
  }, [filteredItems, isLoadingMore]);

  useEffect(() => {
    if (!isLoadingMore && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [filteredItems.length]);

  const [isDragging, setIsDragging] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (tagInput.trim()) {
        onAddTag(tagInput);
        setTagInput("");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleOnDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div
      className="flex flex-col flex-1 bg-[#313338] min-w-0 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleOnDrop}
    >
      {/* ドラッグオーバーレイ */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#5865f2]/20 border-2 border-dashed border-[#5865f2] z-50 flex flex-col items-center justify-center backdrop-blur-[2px] pointer-events-none transition-all">
          <div className="bg-[#313338] p-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-3 border border-[#383a40]">
            <div className="p-4 bg-[#5865f2] rounded-full text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#f2f3f5]">画像をドロップして添付</p>
            <p className="text-xs text-[#949ba4]"># {currentChannel?.name} に画像を添付します</p>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="h-12 border-b border-[#1f2023] flex items-center px-2 md:px-4 font-bold text-white shadow-sm shrink-0">
        <button className="md:hidden p-2 text-[#949ba4] hover:text-white mr-1" onClick={() => setIsMenuOpen(true)}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16a1 1 0 010 2H4a1 1 0 010-2zM4 12h16a1 1 0 010 2H4a1 1 0 010-2zM4 18h16a1 1 0 010 2H4a1 1 0 010-2z" />
          </svg>
        </button>
        <span className="text-[#80848e] mr-2">#</span> {currentChannel?.name}

        <div className="relative flex-1 max-w-[150px] md:max-w-[240px] ml-auto">
          <input
            type="text"
            placeholder="検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1f22] text-[#dbdee1] placeholder-[#949ba4] text-xs rounded px-2 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#5865f2] transition"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#949ba4] hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          ) : (
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#949ba4]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <button
          onClick={() => setIsImageSidebarOpen(!isImageSidebarOpen)}
          className={`ml-auto p-2 rounded transition cursor-pointer ${
            isImageSidebarOpen ? "text-white bg-[#404249]" : "text-[#b5bac1] hover:text-[#dbdee1]"
          }`}
          title="画像一覧を表示"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </button>
      </div>

      {/* メッセージ表示エリア */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMore && (
          <div className="flex justify-center my-2">
            <button
              onClick={handleLoadMoreClick}
              className="px-4 py-1.5 text-xs font-medium text-[#dbdee1] bg-[#2b2d31] hover:bg-[#35373c] border border-[#1e1f22] rounded-full transition cursor-pointer shadow-sm"
            >
              過去のメッセージを読み込む
            </button>
          </div>
        )}

        {/* 🌟 修正ポイント: MessageRow コンポーネントを正しく呼び出す */}
        {filteredItems.map((item) => (
          <MessageRow
            key={item.id}
            item={item}
            onDeleteMessage={onDeleteMessage}
            onEditMessage={onEditMessage}
            onSelectTag={(tag) => setSearchQuery(`#${tag}`)}
            messageRef={(el) => { messageRefs.current[item.id] = el; }}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="text-sm text-[#80848e] italic text-center pt-8">
            メッセージはまだありません。最初のメッセージを送信してみましょう！
          </div>
        )}
      </div>

      {/* 入力フォームエリア */}
      <div className="p-6 bg-[#313338] shrink-0">
        <div className="flex flex-col bg-[#383a40] rounded-xl overflow-hidden">
          {attachedImage && (
            <div className="p-3 bg-[#2b2d31] border-b border-[#1f2023] flex items-center space-x-3 relative group">
              <div className="relative w-16 h-16 rounded-md overflow-hidden border border-[#383a40] bg-[#1e1f22] shrink-0">
                <img
                  src={attachedImage.url}
                  alt={attachedImage.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#dbdee1] truncate">{attachedImage.name}</p>
                <p className="text-[10px] text-[#949ba4]">送信準備完了</p>
              </div>
              <button
                onClick={onRemoveAttachedImage}
                className="p-1 rounded-full bg-[#313338] hover:bg-red-500 text-[#b5bac1] hover:text-white transition cursor-pointer"
                title="添付を取り消す"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="px-5 pt-3 flex flex-wrap items-center gap-2">
            {attachedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-white bg-[#5865f2] px-2 py-1 rounded-md"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-red-300 ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}

            <div className="flex items-center text-xs text-[#949ba4]">
              <span className="mr-1">#</span>
              <input
                type="text"
                placeholder="タグを追加 (Enterで確定)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="bg-transparent text-xs text-[#dbdee1] placeholder-[#80848e] focus:outline-none w-36"
              />
            </div>
          </div>

          <div className="flex items-center px-5 py-4 space-x-4">
            <label className="cursor-pointer text-[#b5bac1] hover:text-[#dbdee1] transition p-1">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-6V5a1 1 0 00-2 0v6H5a1 1 0 000 2h6v6a1 1 0 002 0v-6h6a1 1 0 000-2z" />
              </svg>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
            </label>

            <input
              type="text"
              placeholder={`# ${currentChannel?.name} へのメッセージ`}
              className="bg-transparent flex-1 focus:outline-none text-base text-[#dbdee1] placeholder-[#80848e] font-medium min-w-0"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              onPaste={onPaste}
            />

            <button
              onClick={onSend}
              disabled={!inputText.trim() && !attachedImage}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition cursor-pointer shrink-0 ${
                inputText.trim() || attachedImage
                  ? "bg-[#5865f2] text-white hover:bg-[#4752c4]"
                  : "bg-[#4e5058] text-[#949ba4] cursor-not-allowed"
              }`}
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✏️ 編集機能を内包した 1行分のメッセージコンポーネント
interface MessageRowProps {
  item: MessageItem;
  onDeleteMessage: (id: number) => void;
  onEditMessage?: (id: number, newContent: string) => void;
  onSelectTag?: (tag: string) => void;
  messageRef: (el: HTMLDivElement | null) => void;
}

function MessageRow({ item, onDeleteMessage, onEditMessage, onSelectTag, messageRef }: MessageRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.content);

  const handleSave = () => {
    if (!editText.trim()) return;
    if (onEditMessage && editText.trim() !== item.content) {
      onEditMessage(item.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div
      ref={messageRef}
      className="relative flex flex-col space-y-1 hover:bg-[#2e3035] px-2 py-1 transition w-full overflow-hidden group rounded"
    >
      {/* 送信者名とタイムスタンプ */}
      <div className="flex items-baseline space-x-2">
        <span className="font-semibold text-white text-sm cursor-pointer hover:underline">
          kei5ot
        </span>
        <span className="text-[10px] text-[#949ba4]">{item.time}</span>
      </div>

      {/* 📝 テキスト表示 OR 編集フォームの切り替え */}
      {isEditing ? (
        <div className="flex flex-col space-y-2 my-1 z-10">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-[#383a40] text-[#dbdee1] text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5865f2] border border-[#202225]"
          />
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#949ba4] text-[11px]">
              <kbd className="bg-[#2b2d31] px-1 py-0.5 rounded border border-[#1e1f22]">Enter</kbd> で保存 • 
              <kbd className="bg-[#2b2d31] px-1 py-0.5 rounded border border-[#1e1f22] ml-1">Esc</kbd> でキャンセル
            </span>
            <div className="ml-auto flex space-x-2">
              <button
                onClick={handleCancel}
                className="text-[#dbdee1] hover:underline cursor-pointer px-2 py-0.5"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-2.5 py-0.5 rounded font-medium cursor-pointer transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-[#dbdee1] break-words">
          {/* テキスト描画 */}
          <FormattedText text={item.content} />

          {/* 編集済みフラグ */}
          {item.isEdited && (
            <span className="text-[10px] text-[#949ba4] ml-1.5 font-normal">(編集済)</span>
          )}

          {/* 画像表示 */}
          {item.type === "image" && item.url && (
            <div className="mt-2 max-w-[95%] md:max-w-sm rounded-md overflow-hidden border border-[#2b2d31] bg-[#2b2d31] cursor-pointer">
              <img
                src={item.url}
                onClick={() => window.open(item.url, '_blank')}
                alt={item.content}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* OGPカード表示 */}
          {/(https?:\/\/[^\s]+)/.test(item.content) && (
            <LinkPreviewCard url={item.content.match(/(https?:\/\/[^\s]+)/)?.[0] || ""} />
          )}

          {/* 🏷️ タグ一覧表示 */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.map((tag, idx) => (
                <span
                  key={idx}
                  onClick={() => onSelectTag && onSelectTag(tag)}
                  className="inline-flex items-center text-[11px] font-medium text-[#5865f2] bg-[#5865f2]/10 hover:bg-[#5865f2]/20 px-2 py-0.5 rounded transition cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🛠️ アクションボタン群（🌟 常時表示にするため flex クラスに修正） */}
      {!isEditing && (
        <div className="absolute top-1 right-2 flex items-center space-x-1 bg-[#313338] border border-[#232428] rounded shadow-md z-10 p-0.5">
          {/* ✏️ 編集ボタン */}
          <button
            onClick={() => {
              setEditText(item.content);
              setIsEditing(true);
            }}
            className="px-2 py-1 text-xs text-[#dbdee1] hover:bg-[#404249] rounded transition cursor-pointer flex items-center space-x-1"
            title="メッセージを編集"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span>編集</span>
          </button>

          {/* 🗑️ 削除ボタン */}
          <button
            onClick={() => onDeleteMessage(item.id)}
            className="px-2 py-1 text-xs text-[#dbdee1] hover:bg-[#404249] hover:text-red-400 rounded transition cursor-pointer flex items-center space-x-1"
            title="メッセージを削除"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            <span>削除</span>
          </button>
        </div>
      )}
    </div>
  );
}