"use client";

interface WarnConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WarnConfirm({
  isOpen,
  title,
  message,
  confirmText = "削除",
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
}: WarnConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-[#2b2d31] p-6 shadow-xl">
        
        <h2 className="mb-2 text-lg font-bold text-white">
          {title}
        </h2>

        <p className="mb-6 text-sm text-[#b5bac1] whitespace-pre-line">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-white hover:bg-[#404249]"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}