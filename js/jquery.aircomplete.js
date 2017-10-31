/*!
 * aircomplete 1.0
 * http://airtight.io
 * Licensed under the MIT license
 */
// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;
(function($, window, document, undefined) {

    // undefined is used here as the undefined global
    // variable in ECMAScript 3 and is mutable (i.e. it can
    // be changed by someone else). undefined isn't really
    // being passed in so we can ensure that its value is
    // truly undefined. In ES5, undefined can no longer be
    // modified.

    // window and document are passed through as local
    // variables rather than as globals, because this (slightly)
    // quickens the resolution process and can be more
    // efficiently minified (especially when both are
    // regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = "aircomplete",
        defaults = {
            // how elements are matched against search text
            // only applies to non-ajax setup
            match: function(data, term) {
                return data.toLowerCase().indexOf(term.toLowerCase()) > -1;
            },
            // how matches are returned for the dropdown list
            template: function(data, term) {
                var text = data;
                var terms = term.trim().split(' ');
                for (var i = 0; i < terms.length; i++) {
                    text = text.replace(new RegExp('(' + terms[i] + ')', 'igm'), "<strong>$1</strong>")
                }
                return text;
            },
            // callback for user pressing eter on a selection
            onEnter: function(element) {
                return;
            },
            onClick: function(element) {
                return;
            },
            // should the list inherit styles from the input?
            inheritStyles: true,
            // minimum size of the search text before we start searching
            minSearchStringLength: 3,
            // maybe data is an object, maybe data is a static file
            data: [], // [] | '/path/to/static/file.json'
            // maybe we need to ajax in results
            ajaxOptions: {
                // url: 'http://yoursitehere.com/response.json',
                dataType: 'json', // or jsonp
                method  : 'GET'
            },
            // debug for console output
            debug: true
        };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;

        // jQuery has an extend method that merges the
        // contents of two or more objects, storing the
        // result in the first object. The first object
        // is generally empty because we don't want to alter
        // the default options for future instances of the plugin
        this.options = $.extend({}, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this._state = {
            focused : false,
            expanded: false,
            count   : 0,
            current : 0
        };

        this._inputw;
        this._inputh;

        this._$wrap;
        this._$list;

        this._ajaxRequest;

        this._results;

        this.init();
    }

    Plugin.prototype = {

        init: function() {
            if (this.options.debug) console.log('aircomplete.init()');

            // get the width/height of the input element
            this._inputw = $(this.element).outerWidth();
            this._inputh = $(this.element).outerHeight();

            // turn off autocomplete for the input
            $(this.element).prop("autocomplete", "off");

            // create outer div wrapper
            var $wrap = $("<div></div>");

            $wrap
                .width(this._inputw)
                .height(this._inputh)
                .addClass("aircomplete");

            $(this.element).wrap($wrap);

            // point the $wrap reference to the DOM object
            this._$wrap = $(this.element).parent();

            // create dropdown list
            var $list = $("<ul class='aircomplete-list'></ul>");

            if (this.options['inheritStyles']) {
                $list.css({
                    width: this._inputw,
                    fontFamily: $(this.element).css("font-family"),
                    fontSize: $(this.element).css("font-size")
                });
            }

            this._$wrap.append($list);

            // keep ref to the ul
            this._$list = this._$wrap.find("ul:first");

            $(this._$list)
                .on('click', function(e) {
                    this.onClick(e)
                }.bind(this));
            $(this.element)
                .on('focus',   function(e) { this.onFocus(e)   }.bind(this))
                .on('keydown', function(e) { this.onKeydown(e) }.bind(this))
                .on('keyup',   function(e) { this.onKeyup(e)   }.bind(this));

            $(document)
                .on('click', function(e) {
                    if (!$(e.target).hasClass('aircomplete') && !$(e.target).parents('.aircomplete').size()) {
                    this.onBlur(e);
                }
            }.bind(this));

            $(window)
                .on('resize',  function(e) { this.onResize(e)  }.bind(this));
        },

        onResize: function(e) {
            if (this.options.debug) console.log('aircomplete.onResize()');
            
            // get the width/height of the input element
            this._inputw = this._$wrap.parent().width();
            // this._inputh = this._$wrap.parent().height();
            this._$wrap
                .width(this._inputw)
                .height(this._inputh);
            this._$list
                .width(this._inputw);
        },

        onFocus: function(e) {
            if (this.options.debug) console.log('aircomplete.onFocus()');
            this._state.focused = true;
            this._$list.show();
        },

        onBlur: function(e) {
            if (this.options.debug) console.log('aircomplete.onBlur()');
            this._state.focused = false;
            this._$list.hide();
        },

        onKeydown: function(e) {
            if (this.options.debug) console.log('aircomplete.onKeydown()');

            switch (e.which) {
                case 9: // tab
                    this.onBlur(e);
                    break;
                case 13: // enter
                    e.preventDefault();
                    break;
                case 38: // up
                    e.preventDefault();
                    if (this._state.expanded) {
                        this._state.current = Math.max(this._state.current - 1, 0);
                        this._$list.find("li").removeClass("aircomplete-selected");
                        if (this._state.current) {
                            this._$list.find("li:nth(" + (this._state.current - 1) + ")").addClass("aircomplete-selected");
                        }
                    }
                    break;
                case 40: // down
                    e.preventDefault();
                    if (this._state.expanded) {
                        this._state.current = Math.min(this._state.current + 1, this._state.count);
                        this._$list.find("li").removeClass("aircomplete-selected");
                        this._$list.find("li:nth(" + (this._state.current - 1) + ")").addClass("aircomplete-selected");
                    }
                    break;
            }
        },

        onKeyup: function(e) {
            if (this.options.debug) console.log('aircomplete.onKeyup()');
            
            e.preventDefault();

            switch (e.which) {
                case 38: // up & down arrows get ignored
                case 40:
                    break;
                case 13: // enter
                    if (this._state.current) {
                        var proceed = this.options.onEnter(
                            this._results[this._state.current - 1]
                        );
                        if (proceed) {
                            $(this.element).val(
                                this._$list.find("li:nth(" + (this._state.current - 1) + ")").text()
                            );
                            this._$list.html("");
                            this._state.current = 0;
                            this._state.count = 0;
                        }
                    }
                    break;
                default: // assumed to be input
                    this._state.current = 0;
                    this._state.count = 0;
                    const term = $(this.element).val();
                    if (term.length >= this.options.minSearchStringLength) {
                        this.search(term);
                    } else {
                        this._state.expanded = false;
                        this._state.count = false;
                        this._state.current = 0;
                        this._$list.html("");
                    }
            }
        },

        onClick: function(e) {
            if (this.options.debug) console.log('aircomplete.onClick()');

            if($(e.target).closest('li.aircomplete-list-item')) {
                this._state.current = $(e.target).closest('li.aircomplete-list-item').index() + 1;
                this._$list.find("li").removeClass("aircomplete-selected");
                this._$list.find("li:nth(" + (this._state.current - 1) + ")").addClass("aircomplete-selected");
            }
            if (this._state.current) {
                var proceed = this.options.onClick(
                    this._results[this._state.current - 1]
                );
                if (proceed) {
                    $(this.element).val(
                        this._$list.find("li:nth(" + (this._state.current - 1) + ")").text()
                    );
                    this._$list.html("");
                    this._state.current = 0;
                    this._state.count = 0;
                }
            }

            $(this.element).focus();
        },

        search: function(term) {
            if (this.options.debug) console.log('aircomplete.search()');

            // is it an ajax request?
            if (this.options.ajaxOptions.url) {
                var ajaxOptions = $.extend({},
                    this.options.ajaxOptions, {
                        url: this.options.ajaxOptions.url.replace(
                            '{{term}}', encodeURIComponent(term)
                        )
                    }
                );

                if (this._ajaxRequest) {
                    this._ajaxRequest.abort();
                }

                this._ajaxRequest = $.ajax(ajaxOptions);
                this._ajaxRequest.then(function(results) {
                    this.updateResults(results.data, term);
                }.bind(this));
                // is it a function?
            }
            // else on-page data set 
            else {
                // assign data, check to see if its a fxn
                var data = $.isFunction(this.options.data) ? this.options.data() : this.options.data;

                // if its an object, get the array part
                data = $.isPlainObject(data) ? data.data : data;

                var results = [];

                for (var i in data) {
                    if (this.options.match(data[i], term)) {
                        results.push(data[i]);
                    }
                }

                this.updateResults(results, term);
            }
        },

        updateResults: function(results, term) {
            if (this.options.debug) console.log('aircomplete.updateResults()');

            this._results = results;

            if (results.length) {
                this._state.expanded = true;
                this._state.count = results.length;
                var items = "";
                for (var i = 0; i < results.length; i++) {
                    items += "<li class='aircomplete-list-item'>" + this.options.template(results[i], term) + "</li>";
                }
                this._$list.html(items);
            } else {
                this._state.expanded = false;
                this._state.count = false;
                this._state.current = 0;
                this._$list.html("");
            }
        }

    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                    new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);
