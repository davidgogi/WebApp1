function func(nums, target) {
  let map = new Map();

  for (let i = 0; i < nums.length; i++) {
    if (map.has(target - nums[i])) console.log(nums[i], target - nums[i]);
    else map.set(nums[i], i);
  }
}

let nums = [8, 7, 2, 5, 3, 1];
let target = 10;

func(nums, target);
