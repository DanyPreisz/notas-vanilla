import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import crypto from "node:crypto";
import { connect, isReady, notes, mapNote } from "./db.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(process.cwd(), "public");
const TOKEN = process.env.NOTES_TOKEN || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

function send(res, status, body, headers = {}) {
  const payload =
    body === undefined || body === null
      ? ""
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  const isJson = typeof body !== "string" && body !== undefined && body !== null;
  res.writeHead(status, {
    "Content-Type": isJson
      ? "application/json; charset=utf-8"
      : headers["Content-Type"] || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  });
  res.end(payload);
}

function sendJson(res, status, data) {
  send(res, status, data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(Object.assign(new Error("Cuerpo demasiado grande"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("JSON inválido"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

function validateNote(input) {
  const title = cleanText(input.title, 120);
  const body = cleanText(input.body, 20000);
  if (!title) return { error: "El título es obligatorio" };
  if (!body) return { error: "El contenido es obligatorio" };
  return { title, body };
}

function authorize(req) {
  if (!TOKEN) return null;
  const header = req.headers.authorization || "";
  if (header === `Bearer ${TOKEN}`) return null;
  return { error: "No autorizado" };
}

function noteIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/notes\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (pathname === "/api/health" && method === "GET") {
    sendJson(res, isReady() ? 200 : 503, { ok: isReady() });
    return;
  }

  const denied = authorize(req);
  if (denied) {
    sendJson(res, 401, denied);
    return;
  }

  if (pathname === "/api/notes" && method === "GET") {
    const docs = await notes().find({}).sort({ updatedAt: -1 }).toArray();
    sendJson(res, 200, { notes: docs.map(mapNote) });
    return;
  }

  if (pathname === "/api/notes" && method === "POST") {
    const input = await readBody(req);
    const parsed = validateNote(input);
    if (parsed.error) {
      sendJson(res, 400, { error: parsed.error });
      return;
    }
    const now = new Date().toISOString();
    const note = {
      id: crypto.randomUUID(),
      title: parsed.title,
      body: parsed.body,
      createdAt: now,
      updatedAt: now,
    };
    await notes().insertOne(note);
    sendJson(res, 201, { note: mapNote(note) });
    return;
  }

  const id = noteIdFromPath(pathname);
  if (!id) {
    sendJson(res, 404, { error: "Ruta no encontrada" });
    return;
  }

  if (method === "GET") {
    const doc = await notes().findOne({ id });
    if (!doc) {
      sendJson(res, 404, { error: "Nota no encontrada" });
      return;
    }
    sendJson(res, 200, { note: mapNote(doc) });
    return;
  }

  if (method === "PUT") {
    const input = await readBody(req);
    const parsed = validateNote(input);
    if (parsed.error) {
      sendJson(res, 400, { error: parsed.error });
      return;
    }
    const updatedAt = new Date().toISOString();
    const result = await notes().findOneAndUpdate(
      { id },
      { $set: { title: parsed.title, body: parsed.body, updatedAt } },
      { returnDocument: "after" }
    );
    if (!result) {
      sendJson(res, 404, { error: "Nota no encontrada" });
      return;
    }
    sendJson(res, 200, { note: mapNote(result) });
    return;
  }

  if (method === "DELETE") {
    const result = await notes().deleteOne({ id });
    if (!result.deletedCount) {
      sendJson(res, 404, { error: "Nota no encontrada" });
      return;
    }
    sendJson(res, 200, { ok: true, id });
    return;
  }

  sendJson(res, 405, { error: "Método no permitido" });
}

function serveStatic(res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Prohibido");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "No encontrado");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data.toString("utf8"), {
      "Content-Type": MIME[ext] || "application/octet-stream",
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(res, url);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Error interno" });
  }
});

connect()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Notas vanilla en http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
