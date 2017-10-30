<?php

$term = $_GET['term'];

$planets = [
    ["name" => "Mercury",       "img" => "/examples/img/planets/mercury.jpg" ],
    ["name" => "Vulcan",        "img" => "/examples/img/planets/vulcan.jpg"  ],
    ["name" => "Venus",         "img" => "/examples/img/planets/venus.jpg"   ],
    ["name" => "Earth",         "img" => "/examples/img/planets/earth.jpg"   ],
    ["name" => "Counter-Earth", "img" => "/examples/img/planets/counter-earth.jpg" ],
    ["name" => "Mars",          "img" => "/examples/img/planets/mars.jpg"    ],
    ["name" => "Ceres",         "img" => "/examples/img/planets/ceres.jpg"   ],
    ["name" => "Jupiter",       "img" => "/examples/img/planets/jupiter.jpg" ],
    ["name" => "Saturn",        "img" => "/examples/img/planets/saturn.jpg"  ],
    ["name" => "Uranus",        "img" => "/examples/img/planets/uranus.jpg"  ],
    ["name" => "Neptune",       "img" => "/examples/img/planets/neptune.jpg" ],
    ["name" => "Pluto",         "img" => "/examples/img/planets/pluto.jpg"   ],
    ["name" => "Planet X",      "img" => "/examples/img/planets/planet.jpg"  ],
    ["name" => "Nibiru",        "img" => "/examples/img/planets/nibiru.jpg"  ]
];

$results = [];

foreach ($planets as $planet) {
    if (stripos($planet['name'], $term) !== false) {
        $results[] = $planet;
    }
}

header('Content-Type: application/json');
echo json_encode(['data' => $results]);