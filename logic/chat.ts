export interface Channel {
  id: number;
  name: string;
}

export interface MessageItem {
  id: number;
  channelId: number;
  type: "text" | "image";
  content: string;
  url?: string;
  time: string;
  tags?: string[];
  isEdited?: boolean;
}