export const zones = [
  {
    depth: 0,
    fade: 580,
    title: "The Epipelagic Zone",
    text:
      "Your journey to the depths begins here, at the uppermost part of the ocean's water column.",
    facts: [
      {
        depth: 275,
        text:
          "Because sunlight is plentiful here, life is abundant. 90% of marine life lives in this zone, and many organisms in deeper zones depend on food generated up here.",
      },
      {
        depth: 500,
        text:
          "Depending on the clearness of the water, sunlight can penetrate deep into the ocean. But after a few hundred feet, photosynthesis becomes impossible. ",
      },
    ],
    fish: [
      {
        common: "Ocean Sunfish",
        scientific: "Mola mola",
        depth: 300,
        file: "sunfish.png",
      },
      {
          common: 'Atlantic bluefin tuna',
          scientific: 'Thunnus thynnus',
          depth: 400,
          file: 'tuna.png'
      },
      {
          common: 'Atlantic Herring',
          scientific: 'Clupea harengus',
          depth: 200,
          file: 'herring.png'
      },
      {
          common: 'Diatom',
          scientific: 'Bacillariophyceae',
          depth: 100,
          file: 'diatom.png'
      }
    ],
  },
  {
    depth: 650,
    fade: 3000,
    title: "The Mesopelagic Zone",
    text: "The twilight zone, where only small amounts of light can penetrate.",
    facts: [
      {
        depth: 1200,
        text:
          "This zone begins at depths where only 1% of sunlight penetrates. Because of this, most food in the mesopelagic zone comes in the form of particles that sink from above.",
      },
      {
        depth: 2200,
        text:
          "Organisms in this zone often migrate between the mesopelagic and epipelagic zones in search of food. In order to ease their vertical movement, many fish have developed swim bladders to control their buoyancy.",
      },
    ],
    fish:[
        {
            common:'California Headlightfish',
            scientific: 'Diaphus theta',
            depth: 900,
            file:'headlight.png'
        },
        {
            common: 'Sabertooth',
            scientific: 'Coccorella Atrata',
            depth: 1400,
            file: 'sabertooth.png'
        },
        {
            common:'Barreleye',
            scientific: 'Opisthoproctus soleatus',
            depth: 2000,
            file: 'barreleye.png'
        }
    ]
  },
  {
    depth: 3300,
    fade: 11000,
    title: "The Bathypelagic Zone",
    text:
      "The midnight zone. No light from the surface can make it down here; the only light is from bioluminescent organisms.",
    facts: [
      {
        depth: 5400,
        text:
          "Because of this most life here has evolved to become extremely energy efficient. Many organisms only consume 'marine snow', the bits of dead life and microbes that float down from above.",
      },
      {
        depth: 9000,
        text:
          "This zone is also home to some of the ocean's largest predators. Giant and Colossal squid, sperm whales, and sharks hunt their prey here. ",
      },
    ],
    fish: [
        {
            common: 'Vampire Squid',
            scientific: 'Vampyroteuthis infernalis',
            depth: 4000,
            file: 'vampire.png'
        },
        {
            common: 'Humpback Anglerfish',
            scientific: 'Melanocetus johnsonii',
            depth: 5200,
            file: 'anglerfish.png'
        },
        {
            common: 'Colossal Squid',
            scientific: 'Mesonychoteuthis hamiltoni',
            depth: 7000,
            file: 'colossal.png'
        }
        
    ]
  },
  {
    depth: 13000,
    fade: 21000,
    title: "The Abyssopelagic Zone",
    text: "Complete darkness.",
    facts: [
      {
        depth: 14500,
        text:
          "In the total absence light, organisms have evolved to rely on nothing but the scavenged remains that fall through the other zones. Many are blind, and have developed flexible bodies in order to withstand massive water pressure.",
      },
      {
        depth: 18000,
        text:
          "The few productive animals and bacteria that live this deep sustain themselves on the chemicals and heat from geothermal vents.",
      },
    ],
    fish:[
        {
            common:'Tripodfish',
            scientific: 'Bathypterois grallator',
            depth: 15000,
            file:'tripodfish.png'
        },
        {
            common: 'Dumbo Octopus',
            scientific: 'Grimpoteuthis',
            depth: 13000,
            file: 'dumbo.png'
        },
        {
            common: 'Cusk Eel',
            scientific: 'Abyssobrotula galatheae',
            depth: 17000,
            file:'cusk.png'
        }
    ]
  },
];

export const facts = [];
