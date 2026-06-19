import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-[38px] px-4 py-2",
        icon: "size-[38px]",
        lg: "h-11 rounded-md px-6",
        sm: "h-8 rounded-md px-3 text-xs",
      },
      variant: {
        default: "bg-primary text-primary-foreground shadow-none hover:bg-primary-hover hover:shadow-[var(--shadow-primary-hover)]",
        destructive: "border border-destructive/40 bg-transparent text-destructive shadow-none hover:border-destructive hover:bg-destructive/10 focus-visible:ring-destructive/20",
        ghost: "text-foreground shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        outline: "border border-input bg-transparent shadow-none hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
        secondary: "border border-input bg-transparent text-foreground shadow-none hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
      },
    },
  },
);

function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ className, size, variant }))} data-slot="button" {...props} />;
}

export { Button, buttonVariants };
