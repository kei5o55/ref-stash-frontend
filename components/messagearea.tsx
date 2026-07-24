import { MutableRefObject } from "react";
import { Channel, MessageItem } from "../logic/types";
import { useState,useEffect,useLayoutEffect,useRef } from "react";

interface MessageAreaProps {
  currentChannel?: Channel;
  filteredItems: MessageItem[];
  searchQuery: string;               // 👈 追加
  setSearchQuery: (q: string) => void; // 👈 追加
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
}

export default function MessageArea({
  currentChannel,
  filteredItems,
  searchQuery,       // 👈 追加
  setSearchQuery,   // 👈 追加
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
}: MessageAreaProps) {
    // 📜 1. タイムライン表示エリア用の Ref を作成
  const scrollRef = useRef<HTMLDivElement>(null);

  // 📜 画面のスクロール位置補正用 State & Ref
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const previousScrollHeightRef = useRef<number>(0);

  // 「もっと読み込む」ボタンが押された時の処理
  const handleLoadMoreClick = () => {
    if (scrollRef.current) {
      // 読み込み前の全体の高さを記憶しておく
      previousScrollHeightRef.current = scrollRef.current.scrollHeight;
    }
    setIsLoadingMore(true);
    onLoadMore();
  };

  // 📜 配列更新後のスクロール位置を調整する（画面のチラつきを防ぐため useLayoutEffect を使用）
  useLayoutEffect(() => {
    if (!scrollRef.current) return;

    if (isLoadingMore) {
      // 過去ログ追加後：増えた分の高さ（差分）を計算してスクロール位置を調整！
      const newScrollHeight = scrollRef.current.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeightRef.current;
      scrollRef.current.scrollTop = heightDifference;
      setIsLoadingMore(false);
    }
  }, [filteredItems, isLoadingMore]);

  // 📜 新規メッセージ送信時などの最下部スクロール（既存処理を少し調整）
  useEffect(() => {
    // 過去ログ読み込み中でない、かつ一番下近くにいる時だけ最下部へスクロール
    if (!isLoadingMore && scrollRef.current) {
      // 初期描画時などの自動スクロール
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [filteredItems.length]);


  // 🎯 ドラッグ中かどうかのフラグ
  const [isDragging, setIsDragging] = useState(false);
  // タグ入力欄用のState
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
  

  // ドラッグ領域に入った時
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  // ドラッグ領域から外れた時
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 画面外に出て行った時だけフラグを倒す
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  // ドロップされた時
  const handleOnDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    onDrop(e);
  };



  return (
    <div 
      className="flex flex-col flex-1 bg-[#313338] min-w-0 relative"
      // 🎯 最外枠にドラッグ＆ドロップイベントを設定
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleOnDrop}
    >
      {/* 🌟 ドラッグ中のみ表示されるオーバーレイガイド */}
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

        {/* 検索バー */}
        <div className="relative flex-1 max-w-[150px] md:max-w-[240px] ml-auto">
          <input
            type="text"
            placeholder="検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1f22] text-[#dbdee1] placeholder-[#949ba4] text-xs rounded px-2 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#5865f2] transition"
          />
          {searchQuery ? (
            // 文字が入っている時は「×」ボタンでクリアできるようにする
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#949ba4] hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          ) : (
            // 空の時は虫眼鏡アイコン
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
          {/* 🔄 ↓ 過去ログ読み込みボタン */}
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
        {/* 🔄 ↑ ここまで */}
        {filteredItems.map((item) => (
            <div 
            ref={(el) => { messageRefs.current[item.id] = el; }}
            key={item.id} 
            className="relative flex flex-col space-y-1 hover:bg-[#2e3035] px-2 py-1 transition group w-full"
            >
            <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-white text-sm cursor-pointer hover:underline">
                kei5ot
                </span>
                <span className="text-[10px] text-[#949ba4]">{item.time}</span>
            </div>
            
            {item.type === "text" ? (
                <p className="text-sm text-[#dbdee1] leading-relaxed whitespace-pre-wrap">{item.content}</p>
            ) : (
                <div className="mt-2 max-w-[95%] md:max-w-sm rounded-md overflow-hidden border border-[#2b2d31] bg-[#2b2d31] cursor-pointer">
                <img src={item.url} onClick={() => window.open(item.url, '_blank')} alt={item.content} className="w-full h-auto object-cover" />
                <div className="p-2 text-xs text-[#949ba4]">{item.content}</div>
                </div>
            )}
            {/* 🏷️ ↓ メッセージに付けられたタグ一覧表示 */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => setSearchQuery(`#${tag}`)} // 👈 クリックすると即座にそのタグで絞り込める！
                    className="inline-flex items-center text-[11px] font-medium text-[#5865f2] bg-[#5865f2]/10 hover:bg-[#5865f2]/20 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {/* 🏷️ ↑ ここまで */}
            
            {/* 削除ボタン（opacityは元のホバー仕様に戻す） */}
            {/* テスト用：常にボタンを表示させる */}
            <button 
            onClick={() => onDeleteMessage(item.id)} 
            className="absolute top-0 right-0 m-2 px-2 py-1 text-xs text-[#dbdee1] bg-[#313338] border border-[#232428] rounded shadow-md hover hover:bg-[#404249] hover:text-red-400 transition-all cursor-pointer z-10" 
            >
            削除
            </button>
            </div>
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
          
          {/* 🖼️ ↓ プレビュー表示エリア（画像が添付されている場合のみ表示） */}
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
              
              {/* 添付キャンセル（削除）ボタン */}
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
          {/* 🖼️ ↑ ここまでプレビューエリア */}

          {/* 🏷️ ↓ 添付中タグのバッジ＆タグ追加インプット */}
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

            {/* タグ入力インプット */}
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
          {/* 🏷️ ↑ ここまで */}

          {/* 入力行 */}
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

            {/* 送信ボタン（画像またはテキストがある時にアクティブ化） */}
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