/**
 * Banner dan ASCII art
 */

const chalk = require('chalk');

// ASCII art banner super wibu
const mainBanner = `
 _    _ _           _                           _______    
| |  | | |         | |                      ⭐  |__   __|   
| |  | | |__   __ _| |_ ___  __ _ _ __  _ __    | | __ _  
| |/\\| | '_ \\ / _\` | __/ __|/ _\` | '_ \\| '_ \\   | |/ _\` | 
\\  /\\  / | | | (_| | |_\\__ \\ (_| | |_) | |_) |  | | (_| | 
 \\/  \\/|_| |_|\\__,_|\\__|___/\\__,_| .__/| .__/   |_|\\__, | 
                                 | |   | |            | | 
            𝓦𝓲𝓫𝓾 𝓔𝓭𝓲𝓽𝓲𝓸𝓷 𝓿2.0    |_|   |_|     UwU   |_| 

`;

// Themed divider
const divider = `
★━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━★
`;

// Kawaii loader
const loadingFrames = [
  '(つ✧ω✧)つ', '(つ⌒▽⌒)つ', '(つ°ヮ°)つ', 
  '(つˆ⌣ˆ)つ', '(つ≧▽≦)つ', '(つ☉ω☉)つ'
];

// Show colored banner
function showBanner() {
  console.log(chalk.magenta(mainBanner));
  console.log(chalk.cyan(`${divider}`));
  console.log(chalk.yellow('     ~ WA-TG Bot by Qiventory ~'));
  console.log(chalk.yellow('     ~ Kawaii Bridge System v2.0 ~'));
  console.log(chalk.cyan(`${divider}`));
  console.log('');
}

// Kawaii loading animation
function showLoading(message, durationMs = 3000) {
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.magenta(loadingFrames[i % loadingFrames.length])} ${message}`);
    i++;
  }, 200);
  
  return new Promise(resolve => {
    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write('\r\033[K'); // Clear line
      resolve();
    }, durationMs);
  });
}

module.exports = {
  showBanner,
  showLoading,
  divider,
  loadingFrames
};