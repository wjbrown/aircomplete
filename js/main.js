
const movies = [{
    name: "the hand that rocks the cradle",
    img: "http://"
}, {
    name: "moon",
    img: "http://"
}, {
    name: "Blade runner",
    img: "http://"
}, {
    name: "moonstruck",
    img: "http://"
}, {
    name: "blade",
    img: "https://upload.wikimedia.org/wikipedia/en/1/19/Blade_movie.jpg"
}, {
    name: "blade II",
    img: "https://upload.wikimedia.org/wikipedia/en/6/6d/Blade_II_movie.jpg"
}, {
    name: "blade trinity",
    img: "http://"
}];

$("[aircomplete]").aircomplete({
    // data: ["one","two","three","four","five"]
    data: movies,
    // data: 'http://wjbrown.net/movies.json',
    match: function(element, term) {
	return element.name.toLowerCase().indexOf(term.toLowerCase()) > -1;
    },
    template: function(element, term) {
	return "<div><img src='" + element.img + "' style='width:50px;' />" +
	    element.name.replace(new RegExp('(' + term + ')', 'igm'), "<b>$1</b>") +
	    "</div></li>";
    },
    // ajaxOptions: {
    //    url: 'http://wjbrown.net/movies.php?term={{term}}',
    //    dataType: 'jsonp', // or jsonp
    //    method: 'GET',
    //    jsonpCallback: "myMovies"
    // }
    onEnter: function() {
	// implement a callback here to handle 'enter' key on selectino
    }
});
