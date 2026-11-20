import { writeFileSync } from "node:fs";
import { join } from "node:path";

// LF-21: writes the CommonJS guard the desktop shell loads (development builds
// only, WCF_DESKTOP_OFFLINE_GUARD) into the main process and every child
// process. It refuses every TCP connection and DNS lookup that is not for this
// computer, and records both the refusal and the fact that it was loaded, so
// the test can tell "no connections" apart from "guard never ran".
export function writeOfflineGuard(dir: string) {
  const file = join(dir, "offline-guard.cjs");
  const blockedLog = join(dir, "offline-blocked.log");
  const loadedLog = join(dir, "offline-loaded.log");
  writeFileSync(
    file,
    `"use strict";
const fs = require("node:fs");
const net = require("node:net");
const dns = require("node:dns");
const BLOCKED = ${JSON.stringify(blockedLog)};
const LOADED = ${JSON.stringify(loadedLog)};
const isLoopback = (host) => {
  const name = String(host ?? "localhost").toLowerCase();
  return name === "localhost" || name === "::1" || name === "[::1]" ||
    name === "::ffff:127.0.0.1" || /^127(\\.\\d{1,3}){3}$/.test(name);
};
const record = (what) => fs.appendFileSync(BLOCKED, process.pid + " " + what + "\\n");
fs.appendFileSync(LOADED, process.pid + " " + (process.env.WCF_OFFLINE_GUARD_PROCESS || "main") + "\\n");

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  let first = args[0];
  if (Array.isArray(first)) first = first[0];
  let host, port, path;
  if (first && typeof first === "object") ({ host, port, path } = first);
  else if (typeof first === "string" && Number.isNaN(Number(first))) path = first;
  else { port = first; if (typeof args[1] === "string") host = args[1]; }
  if (!path && !isLoopback(host)) {
    record("connect " + host + ":" + port);
    const error = Object.assign(new Error("offline guard refused " + host), { code: "ECONNREFUSED" });
    process.nextTick(() => this.destroy(error));
    return this;
  }
  return connect.apply(this, args);
};

const lookup = dns.lookup;
dns.lookup = function guardedLookup(hostname, ...rest) {
  if (!isLoopback(hostname)) {
    record("dns " + hostname);
    const callback = rest.find((value) => typeof value === "function");
    const error = Object.assign(new Error("offline guard refused " + hostname), { code: "ENOTFOUND" });
    if (callback) process.nextTick(() => callback(error));
    return {};
  }
  return lookup.call(this, hostname, ...rest);
};
const promisesLookup = dns.promises.lookup;
dns.promises.lookup = function guardedPromisesLookup(hostname, ...rest) {
  if (!isLoopback(hostname)) {
    record("dns " + hostname);
    return Promise.reject(Object.assign(new Error("offline guard refused " + hostname), { code: "ENOTFOUND" }));
  }
  return promisesLookup.call(this, hostname, ...rest);
};
`,
  );
  return { file, blockedLog, loadedLog };
}
