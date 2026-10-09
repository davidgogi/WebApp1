const names = ["banana", "Apple", "apple", "Banana"];

//console.log(names.sort());

console.log(names.sort((a, b) => a.localeCompare(b)));
console.log(names);
