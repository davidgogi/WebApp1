"use strict";
const names = ["banana", "Apple", "apple", "Banana"];
console.log([...names].sort());
// ["Apple", "Banana", "apple", "banana"]
console.log([...names].sort((a, b) => a.localeCompare(b)));
// ["apple", "Apple", "banana", "Banana"]
