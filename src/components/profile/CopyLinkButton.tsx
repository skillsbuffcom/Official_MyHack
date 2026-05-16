"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyLinkButton({ workerId }: { workerId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/profile/${workerId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl px-5 py-3 transition-all bg-white/[0.02]"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 group-active:scale-90 transition-transform" />
      )}
      <span className="font-medium">{copied ? "Copied!" : "Share Portfolio"}</span>
    </button>
  );
}
