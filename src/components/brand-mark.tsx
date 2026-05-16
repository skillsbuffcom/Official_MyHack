import { Fingerprint } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <Fingerprint className="size-5 text-primary" />
      <span className="text-xl font-semibold tracking-[-0.04em]">VeriPro</span>
    </Link>
  );
}
