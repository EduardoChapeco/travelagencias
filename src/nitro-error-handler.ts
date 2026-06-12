export default function (error: any, event: any) {
  const msg = error?.stack || error?.message || String(error);
  console.error("[NITRO ERROR CAUGHT]", msg);

  if (event.node && event.node.res) {
    if (!event.node.res.headersSent) {
      event.node.res.setHeader("content-type", "text/html; charset=utf-8");
      event.node.res.statusCode = 500;
      event.node.res.end(`<div class="debug"><h2>Nitro Error Handler</h2><pre>${msg}</pre></div>`);
    }
  } else {
    // If we're using raw web Response
    event.respondWith(
      new Response(`<div class="debug"><h2>Nitro Error Handler</h2><pre>${msg}</pre></div>`, {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );
  }
}
