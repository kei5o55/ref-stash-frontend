import { Channel } from "../logic/types";

interface ChannnelBarProps {
  channels: Channel[];
  activeChannelId: number|null;//要修正
  setActiveChannelId: (id: number) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  onCreateChannel: () => void;
}

export default function ChannnelBar({
  channels,
  activeChannelId,
  setActiveChannelId,
  isMenuOpen,
  setIsMenuOpen,
  onCreateChannel,
}: ChannnelBarProps) {
  return (
    <div className={`
      fixed inset-0 z-50 md:relative md:flex md:z-10
      transition-all duration-300 ease-in-out
      ${isMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    `}>
      {isMenuOpen && (
        <div className="absolute inset-0 bg-black/50 md:hidden" onClick={() => setIsMenuOpen(false)}></div>
      )}

      <div className="relative flex flex-col w-60 h-full bg-[#2b2d31] p-3 space-y-2 shrink-0">
        <div className="font-bold text-white border-b border-[#1f2023] pb-3 mb-2 px-2 flex justify-between items-center">
          folder
          <button className="md:hidden text-[#949ba4] hover:text-white" onClick={() => setIsMenuOpen(false)}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {channels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => {
                setActiveChannelId(channel.id);
                setIsMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition ${
                channel.id === activeChannelId
                  ? "bg-[#404249] text-white"
                  : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              # {channel.name}
            </div>
          ))}
        </div>

        <button 
          onClick={onCreateChannel}
          className="w-full py-2 bg-[#248046] hover:bg-[#1a6535] text-white text-xs font-semibold rounded transition-all mt-auto"
        >
          + チャンネルを作成
        </button>
      </div>
    </div>
  );
}