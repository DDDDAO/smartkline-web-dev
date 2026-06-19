import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "focus:ring-ring/20 inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-3 py-1 text-xs font-medium whitespace-nowrap transition focus:ring-[3px] focus:outline-none",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
      },
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ className, variant }))} data-slot="badge" {...props} />;
}

export { Badge, badgeVariants };
