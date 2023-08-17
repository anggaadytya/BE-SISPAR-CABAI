function generateCombinations(arr, len) {
    if (len === 1) {
      return arr.map((item) => [item]);
    }
  
    const result = [];
  
    arr.forEach((item, index) => {
      const restCombinations = generateCombinations(arr.slice(index + 1), len - 1);
      restCombinations.forEach((restCombination) => {
        result.push([item, ...restCombination]);
      });
    });
  
    return result;
  }
  
  const inputNumbers = [4, 3, 2, 6, 1, 5];
  for (let combinationLength = 2; combinationLength <= 8; combinationLength++) {
    const combinations = generateCombinations(inputNumbers, combinationLength);
  
    console.log(`Combinations of length ${combinationLength}:`);
    combinations.forEach((combination) => {
      console.log(combination.join(" "));
    });
  
    console.log(""); // Add a line break between different combination lengths
  }
  