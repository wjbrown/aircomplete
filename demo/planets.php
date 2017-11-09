<?php

// sleep(1);

$term = $_GET['searchTerm'];

$planets = [
    ["name" => "Mercury",       "img" => "/demo/img/planets/mercury.jpg" ],
    ["name" => "Vulcan",        "img" => "/demo/img/planets/vulcan.jpg"  ],
    ["name" => "Venus",         "img" => "/demo/img/planets/venus.jpg"   ],
    ["name" => "Earth",         "img" => "/demo/img/planets/earth.jpg"   ],
    ["name" => "Counter-Earth", "img" => "/demo/img/planets/counter-earth.jpg" ],
    ["name" => "Mars",          "img" => "/demo/img/planets/mars.jpg"    ],
    ["name" => "Ceres",         "img" => "/demo/img/planets/ceres.jpg"   ],
    ["name" => "Jupiter",       "img" => "/demo/img/planets/jupiter.jpg" ],
    ["name" => "Saturn",        "img" => "/demo/img/planets/saturn.jpg"  ],
    ["name" => "Uranus",        "img" => "/demo/img/planets/uranus.jpg"  ],
    ["name" => "Neptune",       "img" => "/demo/img/planets/neptune.jpg" ],
    ["name" => "Pluto",         "img" => "/demo/img/planets/pluto.jpg"   ],
    ["name" => "Planet X",      "img" => "/demo/img/planets/planet.jpg"  ],
    ["name" => "Nibiru",        "img" => "/demo/img/planets/nibiru.jpg"  ]
];

$results = [];

foreach ($planets as $planet) {
    if (stripos($planet['name'], $term) !== false) {
        $results[] = $planet;
    }
}

header('Content-Type: application/json');
echo json_encode(['data' => $results]);