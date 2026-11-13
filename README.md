# Ouro Cookbook

Welcome to the Object Unified Reflective Ontology (OURO), a JavaScript AOP Metaobject Protocol. The core philosophy of Ouro is **ruthless minimalism**. The base engine handles only the fundamental existence of objects: creation, initialization, and inheritance. Everything else is an extension.

## Section 1 - Core Mechanics

### Recipe 1: Defining a Minimal Class

To create a class, pass a definition object to `JMOP.load()`. A standard definition uses the protected core vocabulary: `name`, `properties`, and `methods`.

```javascript
// Define a base concept
const Vehicle = JMOP.load({
    name: 'Vehicle',
    properties: {
        isOperational: true,
        speed: 0
    },
    methods: {
        initialize(speed) {
            this.speed = speed || 0;
            console.log(`Vehicle initialized at speed ${this.speed}.`);
        },
        accelerate(amount) {
            this.speed += amount;
            console.log(`Accelerating... Current speed: ${this.speed}`);
        }
    }
});
```

### Recipe 2: Instantiation & Initialization

JMOP seamlessly integrates with JavaScript's native `new` keyword. When an instance is created, JMOP automatically routes arguments to the `initialize` method if it exists.

```javascript
// Create a new instance
const myShip = new Vehicle(50); 
// Console: "Vehicle initialized at speed 50."

myShip.accelerate(25);
// Console: "Accelerating... Current speed: 75"

console.log(myShip.isOperational); 
// Console: true
```

### Recipe 3: Inheritance using `kindOf`

JMOP uses the semantic `kindOf` keyword to establish a single-inheritance prototype chain. Subclasses automatically inherit properties and methods from their parent class, while maintaining their own isolated definition state.

```javascript
// Define a subclass inheriting from Vehicle
const Spaceship = JMOP.load({
    name: 'Spaceship',
    kindOf: Vehicle, // Explicitly declare inheritance
    properties: {
        shields: 100
    },
    methods: {
        initialize(speed, shields) {
            // Call parent initialization manually if needed (standard JS pattern)
            Vehicle.prototype.initialize.call(this, speed);
            this.shields = shields || 100;
            console.log(`Spaceship initialized with shields at ${this.shields}%.`);
        },
        raiseShields() {
            this.shields = 100;
            console.log("Shields at maximum capacity.");
        }
    }
});

const apollo = new Spaceship(10000, 80);
// Console: "Vehicle initialized at speed 10000."
// Console: "Spaceship initialized with shields at 80%."

apollo.accelerate(5000); 
// Console: "Accelerating... Current speed: 15000" (Inherited method)
```