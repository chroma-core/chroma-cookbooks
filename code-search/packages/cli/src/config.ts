import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  CHROMA_API_KEY: z.string().min(1, "CHROMA_API_KEY is required in .env"),
  CHROMA_TENANT: z.string().min(1, "CHROMA_TENANT is required in .env"),
  CHROMA_DATABASE: z.string().min(1, "CHROMA_DATABASE is required in .env"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required in .env"),
});

export const configResult = envSchema.safeParse(process.env);
export const config = configResult.success ? configResult.data : null;
