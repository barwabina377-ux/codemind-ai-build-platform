const { execSync } = require('child_process');
try {
  console.log(execSync('docker --version').toString());
} catch (e) {
  console.log('Docker not found');
}
try {
  console.log(execSync('java -version').toString());
} catch (e) {
  console.log('Java not found');
}
