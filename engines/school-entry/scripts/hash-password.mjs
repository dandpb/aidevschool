import { hashPassword } from "../server/auth.mjs";
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 1025) throw Error("Password too long");
}
const password = input.replace(/\r?\n$/, "");
if (password.length < 12) throw Error("Use at least 12 characters");
console.log(hashPassword(password));
