// Godsworn Faction Profiles & Unit Configuration Registry
var FACTIONS = {
  HEAVENLY_HOST: {
    id: "crusaders",
    name: "The Heavenly Host",
    leader: "King Baldwin IV",
    traits: {
      armorBonus: 1,           // Crusader specialty: Heavy armor
      fortificationHpMult: 1.2  // Stone fortifications bonus HP
    },
    units: {
      peasant: {
        id: "peasant",
        name: "Serf",
        hp: 35,
        maxHp: 35,
        level: 1,
        attack: 3,
        armor: 1,
        speed: 0.9,
        cost: { gold: 50 },
        spriteKey: "footman",
        renderSize: 32,
        hitRadius: 14
      },
      infantry: {
        id: "footman",
        name: "Footman",
        hp: 60,
        maxHp: 60,
        level: 1,
        attack: 6,
        armor: 2 + 1, // Base 2 + Faction Armor Bonus (+1)
        speed: 1.0,
        cost: { gold: 135 },
        spriteKey: "footman",
        renderSize: 32,
        hitRadius: 16
      },
      hero: {
        id: "baldwin",
        name: "King Baldwin IV",
        title: "Hero of the Heavenly Host",
        hp: 350,
        maxHp: 350,
        level: 10,
        attack: 28,
        armor: 12 + 1, // Base 12 + Faction Armor Bonus (+1)
        speed: 1.1,
        aura: "Holy Fervor",
        spriteKey: "baldwin",
        renderSize: 48,
        hitRadius: 22,
        isHero: true
      },
      archer: {
        id: "archer",
        name: "Archer",
        hp: 45,
        maxHp: 45,
        level: 1,
        attack: 9, // High Pierce Attack
        armor: 0,
        speed: 1.15, // Fast-moving ranged unit
        attackRange: 160, // 5 tiles (160px)
        minKiteDistance: 70, // ~2.2 tiles kiting threshold
        cost: { gold: 120, lumber: 40 },
        spriteKey: "archer",
        renderSize: 32,
        hitRadius: 14,
        isRanged: true
      }
    },
    buildings: {
      townHall: {
        name: "Castle Keep",
        size: [3, 3],
        hp: 1200 * 1.2, // 1440 HP (Fortification multiplier 1.2x)
        maxHp: 1440
      },
      farm: {
        name: "Grain Farm",
        size: [2, 2],
        hp: 400 * 1.2, // 480 HP
        maxHp: 480,
        cost: { gold: 100, lumber: 25 },
        foodProvided: 5
      },
      barracks: {
        name: "Barracks",
        size: [3, 3],
        hp: 800 * 1.2, // 960 HP
        maxHp: 960,
        cost: { gold: 150, lumber: 50 }
      },
      lumberMill: {
        name: "Sawmill",
        size: [3, 3],
        hp: 600 * 1.2, // 720 HP
        maxHp: 720,
        cost: { gold: 120, lumber: 100 }
      }
    }
  },
  SHADOW_CORPS: {
    id: "shadow_corps",
    name: "The Shadow Host",
    leader: "Shadow Knight Chieftain",
    units: {
      chieftain: {
        id: "orc_chieftain",
        name: "Shadow Chieftain",
        hp: 220,
        maxHp: 220,
        level: 5,
        attack: 18,
        armor: 4,
        speed: 1.0,
        spriteKey: "orc_chieftain",
        renderSize: 44,
        hitRadius: 20,
        isHero: true
      },
      grunt: {
        id: "orc_grunt",
        name: "Shadow Grunt",
        hp: 75,
        maxHp: 75,
        level: 1,
        attack: 8,
        armor: 2,
        speed: 1.05,
        spriteKey: "orc_grunt",
        renderSize: 32,
        hitRadius: 16
      }
    }
  }
};
window.FACTIONS = FACTIONS;
