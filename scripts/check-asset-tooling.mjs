import { spawnSync } from 'node:child_process';

const result = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });

if (result.status !== 0) {
  console.error('FAIL ffmpeg is required for npm run optimize:assets.');
  console.error('Install ffmpeg or use the GitHub Actions workflow, which installs it before release checks.');
  if (result.error) console.error(result.error.message);
  if (result.stderr) console.error(result.stderr);
  process.exit(1);
}

const firstLine = result.stdout.split(/\r?\n/).find(Boolean) ?? 'ffmpeg available';
console.log(`PASS ${firstLine}`);
