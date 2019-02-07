const convertToBinary = number => padZeroes(number.toString(2));

const padZeroes = str => {
  while (str.length < 16) {
    str = '0' + str;
  }
  return str;
}

module.exports = {
  convertToBinary, padZeroes
}