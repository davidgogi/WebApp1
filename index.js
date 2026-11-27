function func(array) {
  let xor = 0;
  for (let i = 1; i < array.length; i++) {
    xor = xor ^ i;
  }
  for (let item of array) {
    xor = xor ^ item;
  }
  return xor;
}

let array = [1, 2, 3, 4, 2];
console.log(func(array));
