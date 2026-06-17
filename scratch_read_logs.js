import fs from "fs";
import readline from "readline";

async function searchLogs() {
  const fileStream = fs.createReadStream(
    "C:/Users/eduar/.gemini/antigravity-ide/brain/42e16285-407f-4d26-8929-c9647af99150/.system_generated/logs/transcript.jsonl",
  );
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (
      line.toLowerCase().includes("password") ||
      line.toLowerCase().includes("db_") ||
      line.toLowerCase().includes("postgres")
    ) {
      console.log(`Line ${lineCount}: ${line.substring(0, 300)}...`);
    }
  }
}

searchLogs();
