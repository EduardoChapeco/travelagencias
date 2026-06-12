import React from "react";

export function DocumentPage({
  children,
  format = "a4-portrait",
  className = "",
}: {
  children: React.ReactNode;
  format?: "a4-portrait" | "a4-landscape";
  className?: string;
}) {
  const isPortrait = format === "a4-portrait";
  const dims = isPortrait
    ? { width: "210mm", height: "297mm" }
    : { width: "297mm", height: "210mm" };

  return (
    <div
      className={`relative bg-white flex flex-col shrink-0 overflow-hidden box-border ${
        isPortrait ? "a4-page" : "a4-landscape-page"
      } ${className}`}
      style={{
        width: dims.width,
        height: dims.height,
        // When printing via browser or html2pdf, we want the page to force a page break after
        pageBreakAfter: "always",
      }}
    >
      {children}
    </div>
  );
}
