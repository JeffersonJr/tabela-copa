const fs = require('fs');
const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// The valid 3rd-place opponents for each group winner:
const validOpponents = {
  '1E': ['A', 'B', 'C', 'D', 'F'],
  '1I': ['C', 'D', 'F', 'G', 'H'],
  '1A': ['C', 'E', 'F', 'H', 'I'],
  '1L': ['E', 'H', 'I', 'J', 'K'],
  '1D': ['B', 'E', 'F', 'I', 'J'],
  '1G': ['A', 'E', 'H', 'I', 'J'],
  '1B': ['E', 'F', 'G', 'I', 'J'],
  '1K': ['D', 'E', 'I', 'J', 'L']
};

const winners = Object.keys(validOpponents); // 8 winners

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

const combinations = getCombinations(groups, 8); // 495 combinations
const matrix = {};

function solve(combo, assignments, index) {
  if (index === winners.length) return assignments;
  const winner = winners[index];
  const valid = validOpponents[winner];
  for (let i = 0; i < combo.length; i++) {
    const opp = combo[i];
    if (valid.includes(opp) && !Object.values(assignments).includes(opp)) {
      const res = solve(combo, { ...assignments, [winner]: opp }, index + 1);
      if (res) return res;
    }
  }
  return null;
}

for (const combo of combinations) {
  const key = combo.join('');
  const assignment = solve(combo, {}, 0);
  if (!assignment) {
    console.error('No assignment for', key);
  } else {
    // Convert to array of group letters in the exact order of winners
    matrix[key] = winners.map(w => assignment[w]);
  }
}

fs.writeFileSync('scripts/matrix.json', JSON.stringify({ matrix, order: winners }, null, 2));
console.log('Matrix generated with', Object.keys(matrix).length, 'combinations.');
