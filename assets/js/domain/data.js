// Fictional dish library and seed data.
// Nutrition per standard school portion. kind = how the tray renderer draws it.
export const DISHES = [
  // mains
  { id:'m1', type:'main', name:'Teriyaki chicken', kind:'chicken', g:120, kcal:310, p:24, c:14, f:15, price:2.60, cost:1.35, al:['soy','wheat'], tags:[] },
  { id:'m2', type:'main', name:'Beef & broccoli', kind:'beef', g:130, kcal:290, p:22, c:12, f:16, price:2.90, cost:1.70, al:['soy'], tags:['halal'] },
  { id:'m3', type:'main', name:'Baked cod, lemon herb', kind:'fish', g:120, kcal:220, p:23, c:4, f:11, price:3.10, cost:1.80, al:['fish'], tags:['light','halal'] },
  { id:'m4', type:'main', name:'Turkey meatballs', kind:'meatball', g:130, kcal:300, p:21, c:16, f:16, price:2.50, cost:1.30, al:['egg','wheat'], tags:[] },
  { id:'m5', type:'main', name:'Tofu & mushroom stir-fry', kind:'tofu', g:140, kcal:230, p:16, c:12, f:13, price:2.20, cost:0.95, al:['soy'], tags:['light','halal','veg'] },
  { id:'m6', type:'main', name:'Chicken & chickpea curry', kind:'curry', g:150, kcal:320, p:25, c:22, f:13, price:2.70, cost:1.40, al:[], tags:['halal'] },
  { id:'m7', type:'main', name:'Pork & cabbage dumplings', kind:'dumpling', g:140, kcal:340, p:18, c:38, f:12, price:2.40, cost:1.15, al:['wheat'], tags:[] },
  { id:'m8', type:'main', name:'Grilled chicken breast', kind:'grilled', g:110, kcal:210, p:27, c:2, f:9, price:2.80, cost:1.45, al:[], tags:['light','halal'] },
  { id:'m9', type:'main', name:'Lentil & beef chili', kind:'chili', g:150, kcal:300, p:22, c:26, f:11, price:2.40, cost:1.20, al:[], tags:['halal'] },
  { id:'m10', type:'main', name:'Egg & tomato scramble', kind:'eggtomato', g:130, kcal:240, p:15, c:9, f:16, price:1.90, cost:0.80, al:['egg'], tags:['light','halal','veg'] },
  // vegetables
  { id:'v1', type:'veg', name:'Garlic green beans', kind:'beans', g:80, kcal:60, p:2, c:8, f:3, price:0.90, cost:0.45, al:[], tags:['veg'] },
  { id:'v2', type:'veg', name:'Roasted carrots', kind:'carrot', g:80, kcal:70, p:1, c:11, f:3, price:0.80, cost:0.35, al:[], tags:['veg'] },
  { id:'v3', type:'veg', name:'Stir-fried bok choy', kind:'bokchoy', g:80, kcal:50, p:2, c:5, f:3, price:0.90, cost:0.40, al:[], tags:['veg'] },
  { id:'v4', type:'veg', name:'Broccoli florets', kind:'broccoli', g:80, kcal:55, p:4, c:7, f:2, price:1.00, cost:0.50, al:[], tags:['veg'] },
  { id:'v5', type:'veg', name:'Corn & pea medley', kind:'corn', g:90, kcal:95, p:3, c:17, f:2, price:0.80, cost:0.40, al:[], tags:['veg'] },
  { id:'v6', type:'veg', name:'Cucumber salad', kind:'cucumber', g:80, kcal:40, p:1, c:5, f:2, price:0.80, cost:0.35, al:['sesame'], tags:['veg'] },
  // staples
  { id:'s1', type:'staple', name:'Steamed rice', kind:'rice', g:150, kcal:200, p:4, c:44, f:0, price:0.60, cost:0.25, al:[], tags:[] },
  { id:'s2', type:'staple', name:'Brown rice', kind:'brownrice', g:150, kcal:215, p:5, c:45, f:2, price:0.70, cost:0.32, al:[], tags:[] },
  { id:'s3', type:'staple', name:'Whole-wheat pasta', kind:'pasta', g:150, kcal:210, p:7, c:42, f:1, price:0.70, cost:0.35, al:['wheat'], tags:[] },
  { id:'s4', type:'staple', name:'Sweet potato wedges', kind:'sweetpotato', g:130, kcal:180, p:3, c:41, f:1, price:0.80, cost:0.40, al:[], tags:[] },
  // extras
  { id:'e1', type:'extra', name:'Apple slices', kind:'apple', g:100, kcal:55, p:0, c:14, f:0, price:0.60, cost:0.30, al:[], tags:['fruit'] },
  { id:'e2', type:'extra', name:'Plain yogurt', kind:'yogurt', g:120, kcal:90, p:6, c:9, f:3, price:0.80, cost:0.45, al:['milk'], tags:[] },
  { id:'e3', type:'extra', name:'Seaweed & egg soup', kind:'soup', g:200, kcal:60, p:4, c:4, f:3, price:0.60, cost:0.30, al:['egg'], tags:[] },
  { id:'e4', type:'extra', name:'Orange wedges', kind:'orange', g:100, kcal:50, p:1, c:12, f:0, price:0.60, cost:0.30, al:[], tags:['fruit'] },
  { id:'e5', type:'extra', name:'Milk, 8 oz', kind:'milk', g:240, kcal:120, p:8, c:12, f:5, price:0.70, cost:0.40, al:['milk'], tags:[] },
  // à-la-carte treats (only sold at the counter)
  { id:'t1', type:'treat', name:'Chocolate chip cookie', kind:'cookie', g:45, kcal:210, p:2, c:29, f:10, price:1.20, cost:0.35, al:['wheat','milk','egg'], tags:['dessert'] },
  { id:'t2', type:'treat', name:'Apple juice box', kind:'juice', g:200, kcal:110, p:0, c:27, f:0, price:1.00, cost:0.30, al:[], tags:['sugary'] },
];
export const D = Object.fromEntries(DISHES.map(d => [d.id, d]));
export const ALLERGENS = ['milk','egg','fish','soy','wheat','sesame'];
export const TARGET = { kcalMin:560, kcalMax:720, kcal:640, p:20 }; // per lunch, grade 4
export const SET_PRICE = { standard:4.50, light:4.50, halal:4.80 };
export const DAYS = ['Mon','Tue','Wed','Thu','Fri'];

export const CHILD = { name:'Mia', last:'Lin', grade:'Grade 4', school:'Maple Street Elementary', initials:'ML' };
export const PARENT = { name:'Lin' };

// sample trays for the checkout kiosk: dish ids per tray slot [main, veg, staple, extra, side-extra]
export const SAMPLE_TRAYS = [
  { id:'tray1', label:'Mia, today', slots:['m1','v4','s1','e5'] },
  { id:'tray2', label:'Vegetarian', slots:['m5','v3','s2','e1'] },
  { id:'tray3', label:'With treats', slots:['m7','v2','s1','e3'], extras:['t1','t2'] },
  { id:'tray4', label:'Has sesame', slots:['m8','v6','s4','e4'] },
];

export const SCHOOLS = ['Maple Street Elementary','Harbor View Middle','Cedar Park Elementary','Lakeside Elementary','Riverside High','Oak Hill Middle','Pinecrest Elementary','Westgate High','Sunnyvale Elementary','Brookfield Middle','Elm Grove Elementary','North Ridge High'];
export const SCHOOL_STUDENTS = [430,510,300,558,1108,910,774,477,563,766,852,1137];

export const ALERTS = [
  { id:'a1', k:'Westgate High', type:'Raw meat on the cooked-food counter', sev:5, rep:1, days:41, time:'10:42 AM' },
  { id:'a2', k:'Oak Hill Middle', type:'Walk-in fridge at 7 °C for 25 minutes', sev:4, rep:0, days:12, time:'9:15 AM' },
  { id:'a3', k:'Harbor View Middle', type:'Staff without hair cover at prep station', sev:2, rep:3, days:8, time:'10:05 AM' },
  { id:'a4', k:'Pinecrest Elementary', type:'Food sample missing for one dish', sev:3, rep:0, days:55, time:'12:20 PM' },
  { id:'a5', k:'Lakeside Elementary', type:'Bin lid left open near prep area', sev:1, rep:2, days:20, time:'11:31 AM' },
  { id:'a6', k:'Brookfield Middle', type:'Disinfection cycle not logged', sev:3, rep:1, days:5, time:'1:02 PM' },
];

export const CHECKS = [
  ['health','Morning staff health check','Temperature and hand check for 9 kitchen staff'],
  ['sample','Food samples retained','125 g of every dish, sealed and labeled, kept 48 hours'],
  ['disinfect','Tableware disinfected','Steam cabinet cycle logged'],
  ['fridge','Fridge temperatures','Walk-in below 4 °C, freezer below −18 °C'],
  ['receive','Deliveries checked','Batch certificates matched to today’s purchases'],
];
