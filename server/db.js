import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "notas";

let db;

export function isReady() {
  return Boolean(db);
}

export async function connect() {
  if (!uri) throw new Error("Falta MONGODB_URI");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  db = client.db(dbName);
  await db.collection("notes").createIndex({ id: 1 }, { unique: true });
  await db.collection("notes").createIndex({ updatedAt: -1 });
  console.log(`MongoDB conectado (${dbName})`);
  return db;
}

export function notes() {
  return db.collection("notes");
}

export function mapNote(doc) {
  return {
    id: doc.id,
    title: doc.title,
    body: doc.body,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
