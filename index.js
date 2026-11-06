const { AsyncLocalStorage } = require("node:async_hooks");

let current;

function run(store, fn) {
  const previous = current;
  current = store;
  try {
    return fn();
  } finally {
    current = previous;
  }
}

function getStore() {
  return current;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("\n6. Two overlapping requests, my simple run");
  const request = async (name) => {
    console.log(`  ${name} before await:`, getStore());
    await sleep(10);
    console.log(`  ${name} after await: `, getStore());
  };
  await Promise.all([
    run({ company: "A" }, () => request("Ana ")),
    run({ company: "B" }, () => request("Nino")),
  ]);
  console.log("\n7. The same two requests with the real AsyncLocalStorage");
  const storage = new AsyncLocalStorage();
  const realRequest = async (name) => {
    console.log(`  ${name} before await:`, storage.getStore());
    await sleep(10);
    console.log(`  ${name} after await: `, storage.getStore());
  };
  await Promise.all([
    storage.run({ company: "A" }, () => realRequest("Ana ")),
    storage.run({ company: "B" }, () => realRequest("Nino")),
  ]);
}

main();
