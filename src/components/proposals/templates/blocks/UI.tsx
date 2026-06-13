import React from "react";

export function DocumentPage({
  children,
  format = "a4-portrait",
  className = "",
}: {
  children: React.ReactNode;
  format?: "a4-portrait" | "a4-landscape" | "presentation-169";
  className?: string;
}) {
  let dims = { width: "210mm", height: "297mm" };
  let pageClass = "a4-page";

  if (format === "a4-landscape") {
    dims = { width: "297mm", height: "210mm" };
    pageClass = "a4-landscape-page";
  } else if (format === "presentation-169") {
    dims = { width: "1920px", height: "1080px" };
    pageClass = "presentation-page";
  }

  return (
    <div
      className={`relative bg-white flex flex-col shrink-0 overflow-hidden box-border ${pageClass} ${className}`}
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
