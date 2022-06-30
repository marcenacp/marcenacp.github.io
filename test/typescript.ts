const NUMBER_OF_REPETITION = 9999999;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const RANDOM_SEQUENCE = Array(NUMBER_OF_REPETITION)
  .fill(undefined)
  .map(() => {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    return ALPHABET[randomIndex];
  });

const evaluate = (fn: (s: string) => boolean): void => {
  const times: number[] = [];
  const startTime = Date.now();
  for (let i = 0; i < NUMBER_OF_REPETITION; i++) {
    const randomLetter = RANDOM_SEQUENCE[i];
    fn(randomLetter);
  }
  const endTime = Date.now();
  console.log((endTime - startTime) / NUMBER_OF_REPETITION);
};

console.log("x === 'x'");
evaluate((x) => x === 'x'); // 0.0000013200000132 milliseconds

console.log("'x' === x");
evaluate((x) => 'x' === x); // 0.0000136700001367 milliseconds
