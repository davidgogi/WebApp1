const originalLog = console.log;

console.log = function (...args) {
  originalLog("CUSTOM:", ...args);
};

console.log("Hello");

function func() {
  return 1;
}

func.func1 = () => 2;

console.log(func.func1());
