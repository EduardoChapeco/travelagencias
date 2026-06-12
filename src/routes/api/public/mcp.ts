import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Model Context Protocol (MCP) Server for TravelOS
// Implements JSON-RPC 2.0 for AI agent integration (OpenAI, Claude, Lovable, Google)

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      POST: async ({ request }: any) => {
        try {
          const body = await request.json();

          // JSON-RPC validation
          if (!body.jsonrpc || body.jsonrpc !== "2.0" || !body.method) {
            return json(
              {
                jsonrpc: "2.0",
                id: body.id || null,
                error: { code: -32600, message: "Invalid Request" },
              },
              { status: 400 },
            );
          }

          const { method, params, id } = body;

          // 1. Initialize
          if (method === "initialize") {
            return json({
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: "2024-11-05",
                serverInfo: {
                  name: "TravelOS-MCP",
                  version: "1.0.0",
                },
                capabilities: {
                  tools: { listChanged: false },
                },
              },
            });
          }

          // 2. Ping
          if (method === "ping") {
            return json({ jsonrpc: "2.0", id, result: {} });
          }

          // 3. List Tools
          if (method === "tools/list") {
            return json({
              jsonrpc: "2.0",
              id,
              result: {
                tools: [
                  {
                    name: "search_knowledge_base",
                    description:
                      "Search the agency's public Knowledge Base articles for visas, rules, or tips.",
                    inputSchema: {
                      type: "object",
                      properties: {
                        agency_slug: {
                          type: "string",
                          description: "The slug of the agency (e.g. 'acmetravel')",
                        },
                        query: { type: "string", description: "Search term" },
                      },
                      required: ["agency_slug"],
                    },
                  },
                  {
                    name: "get_public_trip_details",
                    description: "Get public information about a specific group tour or public trip.",
                    inputSchema: {
                      type: "object",
                      properties: {
                        trip_slug: { type: "string", description: "The slug of the public trip" },
                      },
                      required: ["trip_slug"],
                    },
                  },
                  {
                    name: "list_blog_posts",
                    description: "List the latest published blog posts from an agency.",
                    inputSchema: {
                      type: "object",
                      properties: {
                        agency_slug: { type: "string", description: "The slug of the agency" },
                        limit: { type: "number", description: "Max results (default 5)" },
                      },
                      required: ["agency_slug"],
                    },
                  },
                ],
              },
            });
          }

          // 4. Call Tool
          if (method === "tools/call") {
            const { name, arguments: args } = params;

            if (name === "search_knowledge_base") {
              const { data: agency } = await supabase
                .from("agencies")
                .select("id")
                .eq("slug", args.agency_slug)
                .maybeSingle();
              if (!agency)
                return json({
                  jsonrpc: "2.0",
                  id,
                  result: { content: [{ type: "text", text: "Agency not found." }] },
                });

              let q = (supabase as any)
                .from("knowledge_articles")
                .select("title, slug, content")
                .eq("agency_id", agency.id)
                .eq("is_internal", false);
              if (args.query) {
                q = q.ilike("title", `%${args.query}%`);
              }

              const { data, error } = await q.limit(5);
              if (error) throw error;

              const text = (data as any[])
                .map(
                  (d) =>
                    `Title: ${d.title}\nURL: /p/${args.agency_slug}/kb/${d.slug}\nExcerpt: ${d.content?.substring(0, 200)}...`,
                )
                .join("\n\n");
              return json({
                jsonrpc: "2.0",
                id,
                result: { content: [{ type: "text", text: text || "No articles found." }] },
              });
            }

            if (name === "list_blog_posts") {
              const { data: agency } = await supabase
                .from("agencies")
                .select("id")
                .eq("slug", args.agency_slug)
                .maybeSingle();
              if (!agency)
                return json({
                  jsonrpc: "2.0",
                  id,
                  result: { content: [{ type: "text", text: "Agency not found." }] },
                });

              const { data, error } = await supabase
                .from("blog_posts")
                .select("title, slug, excerpt, published_at")
                .eq("agency_id", agency.id)
                .eq("status", "published")
                .lte("published_at", new Date().toISOString())
                .order("published_at", { ascending: false })
                .limit(args.limit || 5);

              if (error) throw error;

              const text = data
                .map(
                  (d) =>
                    `Title: ${d.title}\nURL: /p/${args.agency_slug}/blog/${d.slug}\nDate: ${d.published_at}\nExcerpt: ${d.excerpt}`,
                )
                .join("\n\n");
              return json({
                jsonrpc: "2.0",
                id,
                result: { content: [{ type: "text", text: text || "No posts found." }] },
              });
            }

            if (name === "get_public_trip_details") {
              const { data, error } = await supabase
                .from("group_tours")
                .select(
                  "title, destination, base_price, departure_date, return_date, important_notes, itinerary",
                )
                .eq("slug", args.trip_slug)
                .eq("is_public", true)
                .maybeSingle();

              if (error) throw error;
              if (!data)
                return json({
                  jsonrpc: "2.0",
                  id,
                  result: { content: [{ type: "text", text: "Trip not found or not public." }] },
                });

              return json({
                jsonrpc: "2.0",
                id,
                result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] },
              });
            }

            return json(
              { jsonrpc: "2.0", id, error: { code: -32601, message: "Tool not found" } },
              { status: 404 },
            );
          }

          return json(
            { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } },
            { status: 404 },
          );
        } catch (e: any) {
          return json(
            { jsonrpc: "2.0", id: null, error: { code: -32000, message: e.message } },
            { status: 500 },
          );
        }
      },
    },
  },
});
