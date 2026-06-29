import pLimit from "p-limit";

// Maximum 1 concurrent request to prevent Out Of Memory on 1GB RAM VPS
export const scraperLimit = pLimit(1);

export async function randomDelay(min: number = 1000, max: number = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
}
