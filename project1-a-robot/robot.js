// Roads in the village
const roads = [
  "Alice's House-Bob's House",   "Alice's House-Cabin",
  "Alice's House-Post Office",   "Bob's House-Town Hall",
  "Daria's House-Ernie's House", "Daria's House-Town Hall",
  "Ernie's House-Grete's House", "Grete's House-Farm",
  "Grete's House-Shop",          "Marketplace-Farm",
  "Marketplace-Post Office",     "Marketplace-Shop",
  "Marketplace-Town Hall",       "Shop-Town Hall"
];

// Build a graph from the roads
function buildGraph(edges) {
  let graph = Object.create(null);
  function addEdge(from, to) {
    if (from in graph) graph[from].push(to);
    else graph[from] = [to];
  }
  for (let [from, to] of edges.map(r => r.split("-"))) {
    addEdge(from, to);
    addEdge(to, from);
  }
  return graph;
}

const roadGraph = buildGraph(roads);

// State of the world
class VillageState {
  constructor(place, parcels) {
    this.place = place;
    this.parcels = parcels;
  }
  move(destination) {
    if (!roadGraph[this.place].includes(destination)) return this;
    let parcels = this.parcels.map(p => {
      if (p.place != this.place) return p;
      return { place: destination, address: p.address };
    }).filter(p => p.place != p.address);
    return new VillageState(destination, parcels);
  }
}

VillageState.random = function(parcelCount = 5) {
  let parcels = [];
  for (let i = 0; i < parcelCount; i++) {
    let address = randomPick(Object.keys(roadGraph));
    let place;
    do { place = randomPick(Object.keys(roadGraph)); }
    while (place == address);
    parcels.push({ place, address });
  }
  return new VillageState("Post Office", parcels);
};

// Run the robot
function runRobot(state, robot, memory) {
  for (let turn = 0;; turn++) {
    if (state.parcels.length == 0) {
      console.log(`Done in ${turn} turns`);
      break;
    }
    let action = robot(state, memory);
    state = state.move(action.direction);
    memory = action.memory;
    console.log(`Moved to ${action.direction}`);
  }
}

// Helper function - random pick from array
function randomPick(array) {
  let choice = Math.floor(Math.random() * array.length);
  return array[choice];
}

function randomRobot(state) {
  return { direction: randomPick(roadGraph[state.place]) };
}

// Start the robot!
runRobot(VillageState.random(), randomRobot, []);

const mailRoute = [
  "Alice's House", "Cabin", "Alice's House", "Bob's House",
  "Town Hall", "Daria's House", "Ernie's House", "Grete's House",
  "Shop", "Grete's House", "Farm", "Marketplace", "Post Office"
];
// Done in 64 turns

function routeRobot(state, memory) {
  if (memory.length == 0) memory = mailRoute;
  return { direction: memory[0], memory: memory.slice(1) };
}

runRobot(VillageState.random(), routeRobot, []);
// Done in 17 turns

function findRoute(graph, from, to) {
  let work = [{ at: from, route: [] }];
  for (let i = 0; i < work.length; i++) {
    let { at, route } = work[i];
    for (let place of graph[at]) {
      if (place == to) return route.concat(place);
      if (!work.some(w => w.at == place)) {
        work.push({ at: place, route: route.concat(place) });
      }
    }
  }
}

function goalOrientedRobot(state, memory) {
  if (memory.length == 0) {
    let parcel = state.parcels[0];
    if (parcel.place != state.place) {
      memory = findRoute(roadGraph, state.place, parcel.place);
    } else {
      memory = findRoute(roadGraph, state.place, parcel.address);
    }
  }
  return { direction: memory[0], memory: memory.slice(1) };
}

runRobot(VillageState.random(), goalOrientedRobot, []);
// Done in 10 turns

// Measuring a robot
function countTurns(state, robot, memory) {
  for (let turn = 0;; turn++) {
    if (state.parcels.length == 0) return turn;
    let action = robot(state, memory);
    state = state.move(action.direction);
    memory = action.memory;
  }
}

function compareRobots(robot1, robot2) {
  let robot1Turns = 0;
  let robot2Turns = 0;
  let totalStates = 100;
  for (let i = 0; i < totalStates; i++) {
    let state = VillageState.random();
    robot1Turns += countTurns(state, robot1, []);
    robot2Turns += countTurns(state, robot2, []);
  }
  console.log(`Robot 1 average turns: ${robot1Turns / totalStates}`);
  console.log(`Robot 2 average turns: ${robot2Turns / totalStates}`);
}

compareRobots(routeRobot, goalOrientedRobot);

// Robot efficiency
function efficientRobot(state, memory) {
  if (memory.length == 0) {
    let best = null;
    for (let parcel of state.parcels) {
      let route = parcel.place != state.place
        ? findRoute(roadGraph, state.place, parcel.place)
        : findRoute(roadGraph, state.place, parcel.address);
      if (!best || route.length < best.length) best = route;
    }
    memory = best;
  }
  return { direction: memory[0], memory: memory.slice(1) };
}

// Persistent group
class PGroup {
  constructor(map) {
    this.map = map || new Map();
  }

  static get empty() {
    return new PGroup();
  }

  add(value) {
    let newMap = new Map(this.map);
    newMap.set(value, true);
    return new PGroup(newMap);
  }

  delete(value) {
    let newMap = new Map(this.map);
    newMap.delete(value);
    return new PGroup(newMap);
  }

  has(value) {
    return this.map.has(value);
  }
}

let a = PGroup.empty;
let b = a.add(1);
let c = b.add(2);
let d = c.delete(1);

console.log(b.has(1));  // → true
console.log(c.has(1));  // → true
console.log(d.has(1));  // → false
console.log(a.has(1));  // → false (original didn't change!)