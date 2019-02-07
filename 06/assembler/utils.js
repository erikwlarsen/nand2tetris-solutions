const convertToBinary = number => padZeroes(number.toString(2));

const padZeroes = (str) => {
  let padStr = str;
  while (padStr.length < 16) {
    padStr = '0'.concat(padStr);
  }
  return padStr;
};

module.exports = {
  convertToBinary,
  padZeroes,
};
