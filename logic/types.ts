export interface Channel {
  id: number;
  name: string;
}

export interface MessageItem {
  id: number;
  channelId: number; // どのチャンネルに属しているか
  type: "text" | "image";
  content: string;
  //url?: string[];ってしたい
  url?: string;//画像
  time: string;
  tags?: string[]; //複数タグを保持する配列
  isEdited?:boolean;
}
