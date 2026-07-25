import process from "node:process";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const required = [
  "OPENAI_API_KEY",
  "MESHY_API_KEY",
  "DATABASE_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
  "AWS_S3_ENDPOINT",
  "AWS_S3_PUBLIC_URL",
];

function result(name, ok, detail) {
  return { name, ok, detail };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30_000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

async function checkOpenAI() {
  const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return result("OpenAI API", true, "authenticated");
}

async function checkMeshy() {
  const root = String(process.env.MESHY_API_URL ?? "https://api.meshy.ai/openapi/v1").replace(/\/$/, "");
  const response = await fetchWithTimeout(`${root}/image-to-3d?page_size=1`, {
    headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return result("Meshy API", true, "authenticated");
}

async function checkDatabase() {
  const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, connectTimeout: 15_000 });
  try {
    await connection.query("SELECT 1 AS ok");
  } finally {
    await connection.end();
  }
  return result("Production database", true, "connected and query succeeded");
}

async function checkStorage() {
  const endpoint = process.env.AWS_S3_ENDPOINT;
  const client = new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  await client.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET }));
  const publicUrl = new URL(process.env.AWS_S3_PUBLIC_URL);
  if (publicUrl.protocol !== "https:") throw new Error("AWS_S3_PUBLIC_URL must use HTTPS");
  return result("Object storage", true, `bucket reachable; public origin ${publicUrl.origin}`);
}

async function safeCheck(name, fn) {
  try {
    return await fn();
  } catch (error) {
    return result(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const missing = required.filter((name) => !String(process.env[name] ?? "").trim());
  const checks = [];

  if (missing.length) {
    checks.push(result("Required secrets", false, `missing: ${missing.join(", ")}`));
  } else {
    checks.push(result("Required secrets", true, "all required secret names are populated"));
    checks.push(await safeCheck("OpenAI API", checkOpenAI));
    checks.push(await safeCheck("Meshy API", checkMeshy));
    checks.push(await safeCheck("Production database", checkDatabase));
    checks.push(await safeCheck("Object storage", checkStorage));
  }

  const runnerEnabled = String(process.env.LAMALO360_ENABLED ?? "").toLowerCase() === "true";
  checks.push(result(
    "Scheduled production",
    runnerEnabled,
    runnerEnabled ? "LAMALO360_ENABLED=true" : "LAMALO360_ENABLED is not true",
  ));

  const json = { ok: checks.every((entry) => entry.ok), checks };
  console.log(JSON.stringify(json, null, 2));
  if (!json.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, fatal: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
