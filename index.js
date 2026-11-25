function func(nums) {
  let zero = 0;
  for (let item of nums) {
    if (item == 0) zero++;
  }
  let index = 0;
  while (index < zero) {
    nums[index++] = 0;
  }
  while (index < nums.length) {
    nums[index++] = 1;
  }
}

const nums = [1, 0, 1, 0, 1, 0, 0, 1];

func(nums);
console.log(nums);
