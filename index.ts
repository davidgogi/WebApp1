const routes = new Map<string, Function>();

function Controller(path: string) {
  return function (target: Function) {
    console.log("decorating class:", target.name);
    routes.set(path, target);
  };
}

function ControllerWMS(target: Function) {
  console.log("decorating class:", target.name);
  routes.set("WMS", target);
}

@Controller("stores")
class StoresController {
  hello() {
    return "hi from stores";
  }
}

@Controller("sales")
class SalesController {
  hello() {
    return "hi from sales";
  }
}

@ControllerWMS
class WMS {
  hello() {
    return "hi from wms";
  }
}

console.log("routes:", [...routes.keys()]);

const Found = routes.get("sales") as any;
console.log(new Found().hello());
