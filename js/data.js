/* SaveBite: static data (categories, sample foods, built-in recipes) */
(function () {
  const U = SB.utils;

  // shelf = typical days the food lasts (used to suggest an expiry date)
  // value = rough price of one entry, used for the "money saved" estimate
  const categories = {
    fruit:      { label: 'Fruit',          emoji: '🍎', shelf: 5,  value: 2.5 },
    vegetables: { label: 'Vegetables',     emoji: '🥦', shelf: 6,  value: 2.0 },
    dairy:      { label: 'Dairy & eggs',   emoji: '🥛', shelf: 7,  value: 3.0 },
    meat:       { label: 'Meat & fish',    emoji: '🍗', shelf: 3,  value: 6.0 },
    bakery:     { label: 'Bakery',         emoji: '🍞', shelf: 4,  value: 3.0 },
    grains:     { label: 'Pantry & grains',emoji: '🍚', shelf: 90, value: 3.0 },
    leftovers:  { label: 'Leftovers',      emoji: '🍲', shelf: 3,  value: 5.0 },
    frozen:     { label: 'Frozen',         emoji: '🧊', shelf: 60, value: 5.0 },
    drinks:     { label: 'Drinks',         emoji: '🧃', shelf: 7,  value: 2.5 },
    other:      { label: 'Other',          emoji: '🍽️', shelf: 7,  value: 3.0 }
  };

  const day = (n) => U.addDays(U.todayISO(), n);

  /** Foods loaded the first time the app opens. Dates are relative to today. */
  function sampleItems() {
    const rows = [
      ['Milk',            1,   'L',       'dairy',      1,   -5],
      ['Baby spinach',    1,   'pack',    'vegetables', 2,   -3],
      ['Bananas',         4,   'pcs',     'fruit',      1,   -4],
      ['Chicken breast',  500, 'g',       'meat',       2,   -1],
      ['Sliced bread',    1,   'loaf',    'bakery',     -1,  -7],
      ['Leftover pasta',  1,   'portion', 'leftovers',  0,   -2],
      ['Tomatoes',        5,   'pcs',     'vegetables', 4,   -2],
      ['Greek yogurt',    2,   'pcs',     'dairy',      5,   -4],
      ['Eggs',            6,   'pcs',     'dairy',      9,   -5],
      ['Carrots',         6,   'pcs',     'vegetables', 8,   -3],
      ['Cheddar cheese',  200, 'g',       'dairy',      12,  -6],
      ['Onions',          3,   'pcs',     'vegetables', 20,  -4],
      ['Potatoes',        1,   'kg',      'vegetables', 18,  -3],
      ['Basmati rice',    1,   'kg',      'grains',     180, -30]
    ];
    return rows.map(([name, quantity, unit, category, exp, added]) => ({
      id: U.uid(), name, quantity, unit, category, expiry: day(exp), added: day(added)
    }));
  }

  /** Past activity so the savings page has something to show on day one. */
  function sampleHistory() {
    // [days ago, name, category, action]
    const rows = [
      [1, 'Strawberries', 'fruit', 'used'], [2, 'Chicken thighs', 'meat', 'used'],
      [3, 'Lettuce', 'vegetables', 'wasted'], [4, 'Milk', 'dairy', 'used'],
      [5, 'Bread', 'bakery', 'used'], [6, 'Yogurt', 'dairy', 'used'],
      [8, 'Spinach', 'vegetables', 'used'], [9, 'Mushrooms', 'vegetables', 'used'],
      [10, 'Leftover curry', 'leftovers', 'used'], [11, 'Cream', 'dairy', 'wasted'],
      [12, 'Apples', 'fruit', 'used'], [15, 'Tomatoes', 'vegetables', 'used'],
      [16, 'Bananas', 'fruit', 'used'], [17, 'Cheese', 'dairy', 'used'],
      [18, 'Fish fillets', 'meat', 'used'], [19, 'Cucumber', 'vegetables', 'wasted'],
      [22, 'Eggs', 'dairy', 'used'], [23, 'Bread', 'bakery', 'used'],
      [24, 'Peppers', 'vegetables', 'used'], [25, 'Berries', 'fruit', 'wasted'],
      [26, 'Rice', 'grains', 'used'], [30, 'Milk', 'dairy', 'used'],
      [31, 'Carrots', 'vegetables', 'used'], [33, 'Oranges', 'fruit', 'used'],
      [36, 'Leftover pasta', 'leftovers', 'used'], [38, 'Chicken breast', 'meat', 'used']
    ];
    return rows.map(([ago, name, category, action]) => ({
      id: U.uid(), name, category, quantity: 1, unit: 'pcs', action,
      date: day(-ago), value: categories[category].value
    }));
  }

  /* Built-in recipes.
   * key    : words used to match your foods ("a|b" means a OR b)
   * staple : pantry basics we assume you have, so they never count as "missing" */
  const recipes = [
    {
      id: 'veg-fried-rice', title: 'Veggie fried rice', emoji: '🍚', time: 20, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian', 'dairy-free'],
      description: 'The classic way to use up leftover rice and tired vegetables.',
      ingredients: [
        { name: 'Cooked rice', key: 'rice', amount: '2 cups' },
        { name: 'Eggs', key: 'egg', amount: '2' },
        { name: 'Carrots', key: 'carrot', amount: '1 large, diced' },
        { name: 'Peas or mixed vegetables', key: 'pea|corn|bean|broccoli|pepper|capsicum', amount: '1/2 cup' },
        { name: 'Soy sauce', key: 'soy', amount: '2 tbsp', staple: true },
        { name: 'Oil', key: 'oil', amount: '1 tbsp', staple: true }
      ],
      steps: [
        'Heat the oil in a large pan over high heat and cook the carrot and vegetables for 3 minutes.',
        'Push them to one side, crack in the eggs and scramble until just set.',
        'Add the rice and stir-fry for 3 to 4 minutes, breaking up any clumps.',
        'Splash in the soy sauce, toss everything together and serve hot.'
      ]
    },
    {
      id: 'tomato-egg-skillet', title: 'Tomato and egg skillet', emoji: '🍳', time: 25, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian', 'gluten-free', 'dairy-free'],
      description: 'Eggs poached in a spiced tomato sauce. One pan, very forgiving.',
      ingredients: [
        { name: 'Tomatoes', key: 'tomato', amount: '4, chopped' },
        { name: 'Eggs', key: 'egg', amount: '3' },
        { name: 'Onion', key: 'onion', amount: '1, sliced' },
        { name: 'Garlic', key: 'garlic', amount: '2 cloves', staple: true },
        { name: 'Cumin, paprika, salt', key: 'spice', amount: '1 tsp each', staple: true },
        { name: 'Oil', key: 'oil', amount: '1 tbsp', staple: true }
      ],
      steps: [
        'Soften the onion and garlic in oil for 5 minutes.',
        'Add the spices and tomatoes and simmer for 10 minutes until thick.',
        'Make small wells in the sauce and crack in the eggs.',
        'Cover and cook for 5 minutes until the whites are set. Serve with bread if you have it.'
      ]
    },
    {
      id: 'banana-pancakes', title: 'Banana pancakes', emoji: '🥞', time: 15, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian'],
      description: 'The best home for bananas that have gone too soft to eat as they are.',
      ingredients: [
        { name: 'Ripe bananas', key: 'banana', amount: '2' },
        { name: 'Egg', key: 'egg', amount: '1' },
        { name: 'Milk', key: 'milk', amount: '1/2 cup' },
        { name: 'Flour', key: 'flour', amount: '1 cup', staple: true },
        { name: 'Baking powder', key: 'baking', amount: '1 tsp', staple: true }
      ],
      steps: [
        'Mash the bananas in a bowl, then whisk in the egg and milk.',
        'Stir in the flour and baking powder until just combined.',
        'Cook spoonfuls in a lightly oiled pan for 2 minutes per side.',
        'Serve warm with yogurt or fruit.'
      ]
    },
    {
      id: 'veg-soup', title: 'Clear vegetable soup', emoji: '🥣', time: 35, servings: 4, difficulty: 'Easy',
      tags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
      description: 'A warm, simple soup that takes whatever vegetables are going soft.',
      ingredients: [
        { name: 'Carrots', key: 'carrot', amount: '2, chopped' },
        { name: 'Potatoes', key: 'potato', amount: '2, cubed' },
        { name: 'Onion', key: 'onion', amount: '1, chopped' },
        { name: 'Tomatoes', key: 'tomato', amount: '2, chopped' },
        { name: 'Stock or water', key: 'stock', amount: '1 litre', staple: true },
        { name: 'Salt and pepper', key: 'salt', amount: 'to taste', staple: true },
        { name: 'Oil', key: 'oil', amount: '1 tbsp', staple: true }
      ],
      steps: [
        'Soften the onion in oil for 4 minutes.',
        'Add the carrots, potatoes and tomatoes and stir for 2 minutes.',
        'Pour in the stock, bring to a boil, then simmer for 20 minutes until tender.',
        'Season, and blend part of it if you like a thicker soup.'
      ]
    },
    {
      id: 'spinach-pasta', title: 'Creamy spinach pasta', emoji: '🍝', time: 20, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian'],
      description: 'Wilts a whole bag of spinach into a quick cheesy sauce.',
      ingredients: [
        { name: 'Pasta', key: 'pasta|spaghetti|penne|noodle|macaroni', amount: '200 g' },
        { name: 'Spinach', key: 'spinach', amount: '2 big handfuls' },
        { name: 'Milk or cream', key: 'milk|cream', amount: '1/2 cup' },
        { name: 'Cheese', key: 'cheese|cheddar|parmesan', amount: '1/2 cup grated' },
        { name: 'Garlic', key: 'garlic', amount: '1 clove', staple: true },
        { name: 'Oil', key: 'oil', amount: '1 tbsp', staple: true }
      ],
      steps: [
        'Boil the pasta in salted water until al dente. Drain, keeping a splash of the water.',
        'Fry the garlic in oil for 30 seconds, add the spinach and let it wilt.',
        'Pour in the milk, add the cheese and stir until it melts into a sauce.',
        'Toss the pasta through, loosening with pasta water if needed.'
      ]
    },
    {
      id: 'chicken-stir-fry', title: 'Chicken and veg stir-fry', emoji: '🥘', time: 25, servings: 2, difficulty: 'Medium',
      tags: ['dairy-free'],
      description: 'Fast, hot and flexible. Swap in any vegetables you need to use.',
      ingredients: [
        { name: 'Chicken breast', key: 'chicken', amount: '300 g, sliced' },
        { name: 'Carrots', key: 'carrot', amount: '1, in thin sticks' },
        { name: 'Onion', key: 'onion', amount: '1, sliced' },
        { name: 'Bell pepper', key: 'pepper|capsicum', amount: '1, sliced' },
        { name: 'Rice, to serve', key: 'rice', amount: '1 cup dry' },
        { name: 'Soy sauce', key: 'soy', amount: '2 tbsp', staple: true },
        { name: 'Garlic', key: 'garlic', amount: '2 cloves', staple: true },
        { name: 'Oil', key: 'oil', amount: '2 tbsp', staple: true }
      ],
      steps: [
        'Start the rice. Meanwhile, slice everything small so it cooks quickly.',
        'Sear the chicken in hot oil for 5 minutes until cooked through, then set aside.',
        'Stir-fry the onion, carrot and pepper for 4 minutes with the garlic.',
        'Return the chicken, add the soy sauce, toss for 1 minute and serve over rice.'
      ]
    },
    {
      id: 'banana-smoothie', title: 'Banana yogurt smoothie', emoji: '🥤', time: 5, servings: 1, difficulty: 'Easy',
      tags: ['vegetarian', 'gluten-free'],
      description: 'Five minutes and one blender for bananas and yogurt that need finishing.',
      ingredients: [
        { name: 'Bananas', key: 'banana', amount: '1 to 2' },
        { name: 'Yogurt', key: 'yogurt|yoghurt|curd', amount: '1/2 cup' },
        { name: 'Milk', key: 'milk', amount: '1/2 cup' },
        { name: 'Honey', key: 'honey', amount: '1 tsp', staple: true }
      ],
      steps: ['Add everything to a blender.', 'Blend until smooth.', 'Pour and drink straight away.']
    },
    {
      id: 'spinach-omelette', title: 'Cheesy spinach omelette', emoji: '🧀', time: 10, servings: 1, difficulty: 'Easy',
      tags: ['vegetarian', 'gluten-free'],
      description: 'A fast lunch that rescues the last of the spinach and cheese.',
      ingredients: [
        { name: 'Eggs', key: 'egg', amount: '3' },
        { name: 'Spinach', key: 'spinach', amount: '1 handful' },
        { name: 'Cheese', key: 'cheese|cheddar', amount: '1/4 cup grated' },
        { name: 'Butter or oil', key: 'butter|oil', amount: '1 tsp', staple: true }
      ],
      steps: [
        'Beat the eggs with a pinch of salt.',
        'Melt the butter in a pan, add the spinach and let it wilt for 30 seconds.',
        'Pour in the eggs and cook gently until nearly set.',
        'Scatter the cheese over, fold the omelette and serve.'
      ]
    },
    {
      id: 'potato-curry', title: 'Simple potato curry', emoji: '🥔', time: 30, servings: 3, difficulty: 'Easy',
      tags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
      description: 'A dry, spiced potato dish that goes with rice or flatbread.',
      ingredients: [
        { name: 'Potatoes', key: 'potato', amount: '4, cubed' },
        { name: 'Onion', key: 'onion', amount: '1, chopped' },
        { name: 'Tomatoes', key: 'tomato', amount: '2, chopped' },
        { name: 'Turmeric, cumin, chilli, salt', key: 'spice', amount: '1 tsp each', staple: true },
        { name: 'Oil', key: 'oil', amount: '2 tbsp', staple: true }
      ],
      steps: [
        'Heat the oil, then fry the cumin and onion until golden.',
        'Add the tomatoes and the remaining spices and cook for 5 minutes.',
        'Stir in the potatoes and a splash of water, cover and cook on low for 15 minutes.',
        'Uncover, cook off any liquid and serve hot.'
      ]
    },
    {
      id: 'french-toast', title: 'French toast', emoji: '🍞', time: 15, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian'],
      description: 'Day-old bread gets a second life. Only use bread with no sign of mould.',
      ingredients: [
        { name: 'Bread slices', key: 'bread|loaf|bun|roll', amount: '4' },
        { name: 'Eggs', key: 'egg', amount: '2' },
        { name: 'Milk', key: 'milk', amount: '1/2 cup' },
        { name: 'Cinnamon and sugar', key: 'sugar', amount: '1 tsp each', staple: true },
        { name: 'Butter', key: 'butter', amount: '1 tbsp', staple: true }
      ],
      steps: [
        'Whisk the eggs, milk, cinnamon and sugar in a shallow dish.',
        'Soak each slice for 20 seconds per side.',
        'Fry in butter over medium heat for 2 to 3 minutes per side until golden.',
        'Serve with fruit or syrup.'
      ]
    },
    {
      id: 'fruit-salad', title: 'Quick fruit salad', emoji: '🍓', time: 10, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
      description: 'Chop, toss, eat. Works with almost any fruit that is getting soft.',
      ingredients: [
        { name: 'Bananas', key: 'banana', amount: '1' },
        { name: 'Apples', key: 'apple', amount: '1' },
        { name: 'Oranges', key: 'orange', amount: '1' },
        { name: 'Berries or grapes', key: 'berry|strawberry|blueberry|grape', amount: '1 handful' },
        { name: 'Lemon juice', key: 'lemon', amount: 'a squeeze', staple: true }
      ],
      steps: [
        'Chop all the fruit into bite-sized pieces.',
        'Toss with a squeeze of lemon juice to keep it fresh.',
        'Chill for 10 minutes if you have time, then serve.'
      ]
    },
    {
      id: 'pasta-bake', title: 'Leftover pasta bake', emoji: '🧆', time: 25, servings: 2, difficulty: 'Easy',
      tags: ['vegetarian'],
      description: 'Turns yesterday\'s pasta into something that feels new.',
      ingredients: [
        { name: 'Cooked pasta', key: 'pasta|spaghetti|penne|macaroni', amount: '2 cups' },
        { name: 'Tomatoes', key: 'tomato', amount: '3, chopped' },
        { name: 'Cheese', key: 'cheese|cheddar|mozzarella', amount: '1/2 cup grated' },
        { name: 'Onion', key: 'onion', amount: '1/2, chopped' },
        { name: 'Oil, salt, herbs', key: 'herb', amount: 'to taste', staple: true }
      ],
      steps: [
        'Heat the oven to 200 °C (400 °F).',
        'Fry the onion and tomatoes in a little oil for 6 minutes to make a quick sauce.',
        'Mix the sauce with the pasta in an oven dish and cover with the cheese.',
        'Bake for 12 to 15 minutes until bubbling and golden.'
      ]
    }
  ];

  SB.data = { categories, sampleItems, sampleHistory, recipes };
})();
