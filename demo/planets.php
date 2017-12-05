<?php

$term = $_GET['searchTerm'];

$planets = [
    ["name" => "Ceres",         "img" => "/demo/img/planets/ceres.jpg"         ],
    ["name" => "Counter-Earth", "img" => "/demo/img/planets/counter-earth.jpg" ],
    ["name" => "Jupiter",       "img" => "/demo/img/planets/jupiter.jpg"       ],
    ["name" => "Earth",         "img" => "/demo/img/planets/earth.jpg"         ],
    ["name" => "Mars",          "img" => "/demo/img/planets/mars.jpg"          ],
    ["name" => "Mercury",       "img" => "/demo/img/planets/mercury.jpg"       ],
    ["name" => "Neptune",       "img" => "/demo/img/planets/neptune.jpg"       ],
    ["name" => "Nibiru",        "img" => "/demo/img/planets/nibiru.jpg"        ],
    ["name" => "Saturn",        "img" => "/demo/img/planets/saturn.jpg"        ],
    ["name" => "Urectum",       "img" => "/demo/img/planets/urectum.jpg"       ],
    ["name" => "Venus",         "img" => "/demo/img/planets/venus.jpg"         ],
    ["name" => "Vulcan",        "img" => "/demo/img/planets/vulcan.jpg"        ]
];

$results = [];

foreach ($planets as $planet) {
    if (stripos($planet['name'], $term) !== false) {
        $results[] = $planet;
    }
}

header('Content-Type: application/json');

echo json_encode(['data' => $results]);

die();