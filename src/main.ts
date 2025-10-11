import "dotenv/config";

async function main() {
  try {
    console.log("Sneaker Pipeline dev entry. Use CLI: pnpm sync");
  } catch (error) {
    console.error("Dev entry failed:", error);
  }
}

main().catch(console.error);
