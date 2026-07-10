
import { homedir } from "node:os"
import {join} from "node:path"

const GOO_DIR = join(homedir(), ".goo")
const VAULT_DIR = join(GOO_DIR, "vault")

console.log(VAULT_DIR)
