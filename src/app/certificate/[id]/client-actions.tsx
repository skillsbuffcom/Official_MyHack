"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  workerName: string;
  projectTitle: string;
}

export function CertificateClientActions({ workerName, projectTitle }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleDownload = async () => {
    const node = document.getElementById("certificate-content");
    if (!node) return;

    setIsDownloading(true);
    try {
      // Add a slight delay to ensure fonts/styles are settled
      await new Promise((r) => setTimeout(r, 100));
      
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: "#030712", // gray-950
        style: {
          padding: "20px",
          borderRadius: "0",
        },
      });

      const link = document.createElement("a");
      link.download = `VeriPro_${workerName.replace(/\s+/g, "_")}_${projectTitle.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Certificate downloaded as image");
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Failed to generate image");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9 border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5"
        onClick={handleShare}
      >
        {isCopied ? <Check className="w-3 h-3 mr-2 text-teal-400" /> : <Share2 className="w-3 h-3 mr-2" />}
        {isCopied ? "Copied" : "Share"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
        ) : (
          <Download className="w-3 h-3 mr-2" />
        )}
        {isDownloading ? "Generating..." : "Download"}
      </Button>
    </div>
  );
}
