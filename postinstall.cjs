const { writeFileSync } = require("node:fs");

const marker = "cloauqher-safe-install-canary\n";
writeFileSync("/tmp/cloauqher-safe-install-canary", marker, "utf8");
console.log(marker.trim());
