import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "heart"
  | "message"
  | "profile"
  | "spark"
  | "tune"
  | "map"
  | "bell"
  | "phone"
  | "bookmark"
  | "arrow-left"
  | "copy"
  | "mail"
  | "lock"
  | "google"
  | "apple";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z" />
        </svg>
      );
    case "message":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6A3.5 3.5 0 0 1 15.5 16H10l-5 4v-4.5A3.5 3.5 0 0 1 1.5 12V6.5A3.5 3.5 0 0 1 5 3" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="m13.5 2-6 9h4l-1 11 6-9h-4l1-11Z" />
        </svg>
      );
    case "tune":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M5 6h14" />
          <path d="M8 6v12" />
          <path d="M5 18h14" />
          <path d="M16 6v12" />
          <circle cx="8" cy="10" r="2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="14" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M6 16h12l-1.5-2.2V10a4.5 4.5 0 0 0-9 0v3.8L6 16Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M7 4h3l1.5 4-2 1.5a13 13 0 0 0 5 5l1.5-2L20 14v3a2 2 0 0 1-2.2 2A16 16 0 0 1 5 6.2 2 2 0 0 1 7 4Z" />
        </svg>
      );
    case "bookmark":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M7 4h10v16l-5-3-5 3V4Z" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <path d="M15 18 9 12l6-6" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m5 8 7 5 7-5" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
          <rect x="5" y="10" width="14" height="10" rx="3" />
          <path d="M8 10V8a4 4 0 1 1 8 0v2" />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
          <path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.5Z" fill="#4285F4" />
          <path d="M12 22c2.7 0 4.9-.9 6.5-2.4l-3.2-2.6c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4H3.2v2.7A10 10 0 0 0 12 22Z" fill="#34A853" />
          <path d="M6.5 13.9A6 6 0 0 1 6.2 12c0-.7.1-1.3.3-1.9V7.4H3.2A10 10 0 0 0 2 12c0 1.7.4 3.3 1.2 4.6l3.3-2.7Z" fill="#FBBC05" />
          <path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2 10 10 0 0 0 3.2 7.4l3.3 2.7c.8-2.3 3-4 5.5-4Z" fill="#EA4335" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M15.2 3.5c0 1-.4 2-1 2.7-.7.8-1.8 1.4-2.8 1.3-.1-1 .3-2 .9-2.7.7-.8 1.8-1.4 2.9-1.3ZM18.6 17.7c-.5 1.1-.8 1.6-1.4 2.5-.8 1.2-1.9 2.6-3.2 2.6-1.2 0-1.5-.8-3.2-.8-1.6 0-2 .8-3.2.8-1.3 0-2.3-1.3-3.1-2.5-2.2-3.2-2.4-6.9-1.1-8.9.9-1.4 2.3-2.2 3.7-2.2 1.4 0 2.2.8 3.4.8 1.1 0 1.8-.8 3.4-.8 1.2 0 2.5.7 3.4 1.9-3 1.6-2.5 5.8.3 6.6Z" />
        </svg>
      );
    default:
      return null;
  }
}
