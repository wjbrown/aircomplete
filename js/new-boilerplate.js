// jQuery Plugin Boilerplate
// A boilerplate for jumpstarting jQuery plugins development
// version 2.0, July 8th, 2011
// by Stefan Gabos

// the semicolon at the beginning is there on purpose in order to protect the integrity 
// of your scripts when mixed with incomplete objects, arrays, etc.
;(function($) {

    // we need attach the plugin to jQuery's namespace or otherwise it would not be
    // available outside this function's scope
    // "el" should be a jQuery object or a collection of jQuery objects as returned by
    // jQuery's selector engine
    $.aircomplete = function(el, options) {
console.log(el);
        // plugin's default options
        // this is private property and is accessible only from inside the plugin
        var defaults = {
            // how elements are matched against search text
            // only applies to non-ajax setup
            match: function(dataRow, searchTerm) {
                return dataRow.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
            },
            // how matches are formatted for the dropdown list
            template: function(dataRow, searchTerm) {
                var html = dataRow;
                var searchTerms = searchTerm.trim().split(" ");
                for (var i = 0; i < searchTerms.length; i++) {
                    html = html.replace(new RegExp("(" + searchTerms[i] + ")", "igm"), "<strong>$1</strong>");
                }
                return html;
            },
            // defines what should happen if a user selects an item from the list
            // by default, triggered by both click and enter events
            // the value returned from this function will get set as the val() of the input
            // return false to leave the input val() unchanged
            onSelect: function(dataRow) {
                return dataRow.name;
            },
            // should the list inherit styles from the input?
            inheritStyles: true,
            // minimum size of the search text before we start searching
            minSearchStringLength: 3,
            // maybe data is an object, maybe data is a static file
            data: [], // [] | "/path/to/static/file.json"
            // maybe we need to ajax in results
            ajaxOptions: {
                // url: "http://yoursitehere.com/response.json",
                dataType: "json", // or jsonp
                method  : "GET"
            },
            // debug for console output
            // 1 -events only
            // 2  all function calls
            debug: 0
        }

        // to avoid confusions, use "plugin" to reference the
        // current instance of the  object
        var plugin = this;

        // this will hold the merged default, and user-provided options
        // plugin's properties will be accessible like:
        // plugin.settings.propertyName from inside the plugin or
        // myplugin.settings.propertyName from outside the plugin
        // where "myplugin" is an instance of the plugin
        plugin.settings = {}

        // the "constructor" method that gets called when the object is created
        // this is a private method, it can be called only from inside the plugin
        var init = function() {

            // the plugin's final properties are the merged default and 
            // user-provided options (if any)
            plugin.settings = $.extend({}, defaults, options);

            // make the collection of target elements available throughout the plugin
            // by making it a public property
            plugin.el = el;

            plugin._state = {
                expanded: false,
                count   : 0,
                current : 0
            };
    
            // get the width/height of the input element
            plugin._inputw = $(plugin.el).outerWidth();
            plugin._inputh = $(plugin.el).outerHeight();
            
            // create outer div wrapper
            var $wrap = $("<div></div>");
        
            $wrap
                .width(this._inputw)
                .height(this._inputh)
                .addClass("aircomplete");

            $(plugin.el).wrap($wrap);

            // point the $wrap reference to the DOM object
            plugin._$wrap = $(plugin.el).parent();
            
            // create dropdown list
            var $list = $("<ul class='aircomplete-list'></ul>");
        
            if (plugin.setttings.inheritStyles) {
                $list.css({
                    width:      plugin._inputw,
                    fontFamily: $(plugin.el).css("font-family"),
                    fontSize:   $(plugin.el).css("font-size")
                });
            }

            plugin._$wrap.append($list);

            // keep ref to the ul
            plugin._$list = plugin._$wrap.find("ul:first");
    


            plugin._ajaxRequest;
    
            plugin._results;

            // turn off autocomplete for the input
            $(plugin.el).prop("autocomplete", "off");

            $(plugin._$list)
                .on('click', function(e) {
                    onClick(e);
                });

            $(plugin.el)
                .on('focus',   function(e) { onFocus(e);   })
                .on('keydown', function(e) { onKeydown(e); })
                .on('keyup',   function(e) { onKeyup(e);   });

            $(document)
                .on('click', function(e) {
                    if (!$(e.target).hasClass('aircomplete') && !$(e.target).parents('.aircomplete').size()) {
                        onBlur(e);
                    }
                });

            $(window)
                .on('resize',  function(e) { onResize(e);  });
        }

        // public methods
        // these methods can be called like:
        // plugin.methodName(arg1, arg2, ... argn) from inside the plugin or
        // myplugin.publicMethod(arg1, arg2, ... argn) from outside the plugin
        // where "myplugin" is an instance of the plugin

        // a public method. for demonstration purposes only - remove it!
        plugin.foo_public_method = function() {

            // code goes here

        }

        // empties the autocomplete list, resetting the plugin state
        plugin.emptyList = function() {
            debug('aircomplete.emptyList()');
            plugin._state = {
                count   : 0,
                current : 0
            };
            plugin._$list.html("");
            plugin.hideList();
        }

        // focuses the next item in the list
        plugin.focusNextListItem = function() {
            debug('aircomplete.focusNextListItem()');
            if (plugin._state.expanded) {
                plugin._state.current = (plugin._state.current + 1) % (plugin._state.count + 1);
                plugin.focusListItem(plugin._state.current -1);
            }
        }

        // focuses the previous item in the list
        plugin.focusPrevListItem = function() {
            debug('aircomplete.focusPrevListItem()');
            if (plugin._state.expanded) {
                plugin._state.current = plugin._state.current === 0 ? plugin._state.count : plugin._state.current-1;
                plugin.focusListItem(plugin._state.current - 1);
            }
        }

        // highlights the currently focused item in the list
        plugin.focusListItem = function(index) {
            debug('aircomplete.focusListItem()');
            if (plugin._state.expanded) {
                plugin._$list.find("li").removeClass("aircomplete-focused");
                plugin._$list.find("li:nth(" + index + ")").addClass("aircomplete-focused");
            }
        }

        // 'chooses' the item from the list
        plugin.selectListItem = function() {
            debug('aircomplete.selectListItem()');
            if (plugin._state.current) {
                var value = plugin.settings.onSelect(
                    plugin._results[plugin._state.current - 1]
                );

                if (value !== false) {
                    plugin.setInputValue(value);
                    plugin.emptyList();
                    $(plugin.el).focus();
                }
            }
        }

        plugin.setInputValue = function(value) {
            $(plugin.el).val(value);
        }

        // shows/expands the autocomplete list
        plugin.showList = function() {
            debug('aircomplete.showList()');
            plugin._state.expanded = true;
            plugin._$list.show();
        }

        // hides/contracts the autocomplete list
        plugin.hideList = function() {
            debug('aircomplete.hideList()');
            plugin._state.expanded = false;
            plugin._$list.hide();
        }

        // private methods
        // these methods can be called only from inside the plugin like:
        // methodName(arg1, arg2, ... argn)

        // a private method. for demonstration purposes only - remove it!
        var onResize = function(e) {
            debug('aircomplete.onResize()');
            // get the width/height of the input element
            plugin._inputw = plugin._$wrap.parent().width();
            // plugin._inputh = plugin._$wrap.parent().height();
            plugin._$wrap
                .width(plugin._inputw)
                .height(plugin._inputh);
            plugin._$list
                .width(plugin._inputw);
        };

        var onFocus = function(e) {
            debug('aircomplete.onFocus()');
            plugin._$list.show();
        };

        var onBlur = function(e) {
            debug('aircomplete.onBlur()');
            plugin._$list.hide();
        };

        var onKeydown = function(e) {
            debug('aircomplete.onKeydown()');
            switch (e.which) {
                case 9: // tab
                    onBlur(e);
                    break;
                case 13: // enter
                    e.preventDefault();
                    break;
                case 38: // up
                    e.preventDefault();
                    plugin.focusPrevListItem();
                    break;
                case 40: // down
                    e.preventDefault();
                    plugin.focusNextListItem();
                    break;
            }
        };

        var onKeyup = function(e) {
            debug('aircomplete.onKeyup()');
            e.preventDefault();
            switch (e.which) {
                case 38: // up & down arrows get ignored
                case 40:
                    break;
                case 13: // enter
                    plugin.selectListItem();
                    break;
                default: // assumed to be input
                    var term = $(plugin.el).val();
                    if (term.length >= plugin.settings.minSearchStringLength) {
                        search(term);
                    } else {
                        plugin.emptyList();
                    }
            }
        };

        var onClick = function(e) {
            debug('aircomplete.onClick()');
            if($(e.target).closest('li.aircomplete-list-item')) {
                plugin._state.current = $(e.target).closest('li.aircomplete-list-item').index() + 1;
            }
            plugin.selectListItem();
        };
            
        // generic search that delegates down to a more specific search
        var search = function(term) {
            debug('aircomplete.search()');
            // is it an ajax request?
            if (plugin.settings.ajaxOptions.url) {
                ajaxSearch(term);
            }
            // else on-page data set 
            else {
                localSearch(term);
            }
        };

        // for search via ajax
        var ajaxSearch = function(term) {
            debug('aircomplete.ajaxSearch()');
            var ajaxOptions = $.extend({},
                plugin.settings.ajaxOptions, {
                    url: plugin.settings.ajaxOptions.url.replace(
                        '{{term}}', encodeURIComponent(term)
                    )
                }
            );

            // if we already have an outstanding ajax request, abort it
            if (plugin._ajaxRequest) {
                plugin._ajaxRequest.abort();
            }

            plugin._ajaxRequest = $.ajax(ajaxOptions);
            plugin._ajaxRequest.then(function(results) {
                populateList(results.data, term);
            }.bind(plugin));
        };

        // for searching a local dataset / array
        var localSearch = function(term) {
            debug('aircomplete.localSearch()');
            // assign data, check to see if its a fxn
            var data = $.isFunction(plugin.settings.data) ? plugin.settings.data() : plugin.settings.data;

            // if its an object, get the array part
            data = $.isPlainObject(data) ? data.data : data;

            var results = [];

            for (var i in data) {
                if (plugin.settings.match(data[i], term)) {
                    results.push(data[i]);
                }
            }

            populateList(results, term);
        };

        // populates the autocomplete list with the items provided
        var populateList = function(results, term) {
            debug('aircomplete.populateList()');
            plugin._results = results;
            // if there are results
            if (results.length) {
                plugin._state.count = results.length;
                var items = "";
                for (var i = 0; i < results.length; i++) {
                    items += "<li class='aircomplete-list-item'>" + plugin.settings.template(results[i], term) + "</li>";
                }
                plugin._$list.html(items);
                plugin.showList();
            } 
            // otherwise
            else {
                plugin.emptyList();
            }
        };

        var debug = function(str) {
            if (plugin.settings.debug) {
                console.log(str);
            }
        };

        // call the "constructor" method
        init();

    }

})(jQuery);