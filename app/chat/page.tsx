'use client';

import { useState, useEffect } from 'react';
import { Channel, Message } from '../../logic/chat';

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 環境変数から API URL を取得（未設定時は PC / WSL 向けの localhost:3000）
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // 1. チャンネル一覧の取得
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/channels`);
        if (!res.ok) throw new Error('チャンネル一覧の取得に失敗しました');
        const data: Channel[] = await res.json();
        setChannels(data);

        // 取得できたら最初のチャンネルを自動選択
        if (data.length > 0) {
          setCurrentChannel(data[0]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, [API_BASE_URL]);

  // 2. 選択されたチャンネルのメッセージ一覧取得
  useEffect(() => {
    if (!currentChannel) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/channels/${currentChannel.id}/messages`);
        if (!res.ok) throw new Error('メッセージの取得に失敗しました');
        const data: Message[] = await res.json();
        setMessages(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [currentChannel, API_BASE_URL]);

  // 3. 新規メッセージの送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChannel) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/channels/${currentChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: { content: newMessage }
        }),
      });

      if (!res.ok) throw new Error('メッセージの送信に失敗しました');

      const createdMessage: Message = await res.json();
      // 一覧の末尾に新規メッセージを即時追加
      setMessages((prev) => [...prev, createdMessage]);
      setNewMessage('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loadingChannels) {
    return <div style={{ padding: '20px' }}>チャンネルを読み込み中...</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* エラー表示領域 */}
      {error && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: '#ffdddd', color: 'red', padding: '10px', borderRadius: '4px', zIndex: 100 }}>
          {error}
        </div>
      )}

      {/* 左サイドバー: チャンネル一覧 */}
      <aside style={{ width: '250px', borderRight: '1px solid #ddd', padding: '16px', background: '#f8f9fa' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>チャンネル</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {channels.map((channel) => (
            <li key={channel.id} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => setCurrentChannel(channel)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: currentChannel?.id === channel.id ? '#0070f3' : 'transparent',
                  color: currentChannel?.id === channel.id ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: currentChannel?.id === channel.id ? 'bold' : 'normal',
                }}
              >
                # {channel.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* 右メインエリア: メッセージ表示領域 & 送信フォーム */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {currentChannel ? (
          <>
            {/* ヘッダー */}
            <header style={{ padding: '16px', borderBottom: '1px solid #ddd', background: '#fff' }}>
              <h3 style={{ margin: 0 }}># {currentChannel.name}</h3>
            </header>

            {/* メッセージ本文表示領域 */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#fafafa' }}>
              {loadingMessages ? (
                <div>メッセージを読み込み中...</div>
              ) : messages.length === 0 ? (
                <div style={{ color: '#888' }}>メッセージはまだありません</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ marginBottom: '16px', background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111' }}>{msg.user?.name || 'ユーザー'}</strong>
                      <small style={{ color: '#888' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#333' }}>{msg.content}</p>

                    {/* 添付ファイル（attachments）一覧表示 */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {msg.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.path || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.85rem',
                              color: '#0070f3',
                              textDecoration: 'none',
                              background: '#e6f0ff',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            📎 {att.file_name || `添付ファイル #${att.id}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* メッセージ入力フォーム */}
            <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid #ddd', background: '#fff', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`#${currentChannel.name} にメッセージを送信`}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ padding: '10px 20px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                送信
              </button>
            </form>
          </>
        ) : (
          <div style={{ padding: '20px' }}>チャンネルを選択してください</div>
        )}
      </main>
    </div>
  );
}