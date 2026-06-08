#!/usr/bin/env node

import { constants as osConstants } from "node:os";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_DEV_PORT = 3000;
const MAX_PORT = 65535;
const NEXT_CLI_PATH = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

export function parseDevArgs(args, env = process.env) {
  const cliPort = readOptionValue(args, "--port", "-p");
  const requestedPort = cliPort ?? (env.PORT === undefined || env.PORT === "" ? String(DEFAULT_DEV_PORT) : env.PORT);
  const startPort = parsePort(requestedPort);

  if (startPort === null) {
    throw new Error(`Invalid dev server port: ${requestedPort}`);
  }

  return {
    host: readOptionValue(args, "--hostname", "-H"),
    passthroughArgs: stripPortArgs(args),
    startPort,
  };
}

export async function findAvailablePort(startPort, host) {
  for (let port = startPort; port <= MAX_PORT; port += 1) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }

  throw new Error(`No available dev server port found at or above ${startPort}.`);
}

function parsePort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    return null;
  }

  return port;
}

function readOptionValue(args, longName, shortName) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === longName || arg === shortName) {
      return args[index + 1];
    }

    if (arg.startsWith(`${longName}=`)) {
      return arg.slice(longName.length + 1);
    }

    if (arg.startsWith(shortName) && arg.length > shortName.length) {
      const value = arg.slice(shortName.length);

      return value.startsWith("=") ? value.slice(1) : value;
    }
  }

  return undefined;
}

async function isPortAvailable(port, host) {
  for (const probeHost of getPortProbeHosts(host)) {
    if (!(await canListen(port, probeHost))) {
      return false;
    }
  }

  return true;
}

function getPortProbeHosts(host) {
  if (host === "0.0.0.0") {
    return ["0.0.0.0", "127.0.0.1"];
  }

  if (host === "::") {
    return ["::", "::1"];
  }

  if (host === "localhost") {
    return ["localhost", "127.0.0.1", "::1"];
  }

  if (host) {
    return [host];
  }

  return ["0.0.0.0", "127.0.0.1", "::", "::1", "localhost"];
}

function stripPortArgs(args) {
  const strippedArgs = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--port" || arg === "-p") {
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=") || (arg.startsWith("-p") && arg.length > 2)) {
      continue;
    }

    strippedArgs.push(arg);
  }

  return strippedArgs;
}

async function canListen(port, host) {
  const server = createServer();

  server.unref();

  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }

      if (error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT") {
        resolve(true);
        return;
      }

      reject(error);
    });

    server.listen(host ? { host, port } : { port }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

async function main() {
  const { host, passthroughArgs, startPort } = parseDevArgs(process.argv.slice(2));
  const port = await findAvailablePort(startPort, host);

  if (port !== startPort) {
    console.log(`Port ${startPort} is in use. Starting Next.js on port ${port} instead.`);
  }

  const child = spawn(process.execPath, [NEXT_CLI_PATH, "dev", "--port", String(port), ...passthroughArgs], {
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      child.kill(signal);
    });
  }

  child.once("exit", (code, signal) => {
    if (signal) {
      process.exit(128 + (osConstants.signals[signal] ?? 0));
    }

    process.exit(code ?? 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
