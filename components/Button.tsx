import Link from "next/link";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type AnchorButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  as?: "a";
  children: ReactNode;
};

type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  as: "button";
  children: ReactNode;
};

type ButtonProps = AnchorButtonProps | NativeButtonProps;

const buttonClassName =
  "inline-flex rounded-full bg-signal px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:scale-[1.03] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-signal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

export function Button({ children, className = "", ...props }: ButtonProps) {
  const classes = `${buttonClassName} ${className}`;

  if (props.as === "button") {
    const { as, ...buttonProps } = props;
    void as;

    return (
      <button className={classes} {...buttonProps}>
        {children}
      </button>
    );
  }

  const { as, ...anchorProps } = props;
  void as;

  if (typeof anchorProps.href === "string" && anchorProps.href.startsWith("/")) {
    return (
      <Link className={classes} href={anchorProps.href} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <a className={classes} {...anchorProps}>
      {children}
    </a>
  );
}
