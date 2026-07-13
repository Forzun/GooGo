// debug.ts
import { Database } from "bun:sqlite";
import { DB_PATH } from "./init";
import { embed } from "./embed";

const db = new Database(DB_PATH);
const rows = db.query("SELECT id, content, embedding FROM memories").all() as any[];

const first = rows[0];
const buf = first.embedding as Buffer;
const vec = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

console.log("first vec[1]:", vec[0]);  // should be like 0.848, not 0 or NaN
console.log("first vec[1]:", vec[1]);  // same
