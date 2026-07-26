import { BadgeCheck, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerificationBadge({
  verified,
  lastVerifiedAt,
  className,
}: {
  verified: boolean;
  lastVerifiedAt?: string;
  className?: string;
}) {
  if (verified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Verified
        {lastVerifiedAt &&
          ` ${new Date(lastVerifiedAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      title="This place has not been manually verified."
    >
      <CircleHelp className="h-3.5 w-3.5" aria-hidden />
      Not manually verified
    </span>
  );
}
