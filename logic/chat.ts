export type User = {
  id: number;
  name: string;
  email?: string;
};

// スキーマの attachments テーブル（file_name, path）に合わせた型
export type Attachment = {
  id: number;
  file_name?: string;
  path?: string;
  created_at: string;
};

export type Message = {
  id: number;
  content: string;
  created_at: string;
  user: User;
  attachments?: Attachment[];
};

export type Channel = {
  id: number;
  name: string;
  created_at: string;
};